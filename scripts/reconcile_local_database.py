"""Reconcile a local SQLite database left behind by the reverted workspace.

Keeps a complete backup and copies supported account/workspace records into a
fresh schema. This is only for the specific abandoned migration branch; normal
databases should use manage.py migrate. Never use this against production.
"""
import json
import os
from pathlib import Path
import sqlite3
import sys
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'server' / 'db.sqlite3'
STAGED = ROOT / 'server' / 'db.reconciled.sqlite3'

if os.environ.get('DATABASE_URL'):
    raise SystemExit('Refusing reconciliation when DATABASE_URL is configured.')
if STAGED.exists():
    raise SystemExit('Staging database already exists; inspect it before retrying.')

source = sqlite3.connect(SOURCE)
source.row_factory = sqlite3.Row
names = {row[0] for row in source.execute("SELECT name FROM django_migrations WHERE app='api'")}
if '0005_learningresource_resume_target_role_resume_template_and_more' not in names:
    raise SystemExit('This database does not need abandoned-branch reconciliation. Use migrate.')
backup_path = SOURCE.with_name(f'db.before-reconcile-{datetime.now():%Y%m%d-%H%M%S}.sqlite3')
with sqlite3.connect(backup_path) as backup:
    source.backup(backup)

os.environ['DATABASE_URL'] = f'sqlite:///{STAGED.as_posix()}'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, str(ROOT / 'server'))
import django
django.setup()
from django.core.management import call_command
from django.db import connections
call_command('migrate', interactive=False, verbosity=0)
connections.close_all()

tables = [
    'django_content_type', 'auth_permission', 'auth_group', 'auth_user',
    'auth_group_permissions', 'auth_user_groups', 'auth_user_user_permissions',
    'django_admin_log', 'django_session', 'authtoken_token', 'api_userprofile',
    'api_offer', 'api_promocode', 'api_transaction', 'api_resume', 'api_tutorialvideo',
]
counts = {}
with sqlite3.connect(STAGED) as target:
    target.execute('PRAGMA foreign_keys=OFF')
    for table in tables:
        columns = [row[1] for row in target.execute(f'PRAGMA table_info({table})')]
        target.execute(f'DELETE FROM {table}')
        rows = list(source.execute(f'SELECT * FROM {table}'))
        for row in rows:
            values = dict(row)
            if table == 'api_userprofile' and values.get('plan') in ('basic', 'premium'):
                values['plan'] = 'pro'
            if table == 'api_tutorialvideo':
                values['is_active'] = values.get('is_published', False)
                values['duration'] = ''
            if table == 'api_resume':
                values['template'] = values.get('template') if values.get('template') in ('classic', 'modern', 'minimal', 'professional', 'executive', 'creative', 'tech', 'startup', 'elegant') else 'classic'
                values['title'] = values.get('title') or 'My resume'
            used = [key for key in columns if key in values]
            target.execute(f'INSERT INTO {table} ({",".join(used)}) VALUES ({",".join("?" for _ in used)})', [values[key] for key in used])
        counts[table] = len(rows)
    # Retain the two supported document types if the abandoned branch contains them.
    for table, kind in [('api_linkedinkit', 'linkedin'), ('api_coverletter', 'cover')]:
        for row in source.execute(f'SELECT * FROM {table}'):
            row = dict(row)
            content = row['content']
            if kind == 'cover':
                content = json.dumps({'letter': content})
            target.execute('INSERT INTO api_workspacedocument (user_id,kind,title,content,updated_at) VALUES (?,?,?,?,?)', [row['user_id'], kind, 'LinkedIn profile' if kind == 'linkedin' else f"Cover letter · {row.get('company', '')}", content, row['updated_at']])
    target.commit()
    if target.execute('PRAGMA foreign_key_check').fetchall():
        raise RuntimeError('Foreign key validation failed; original database is unchanged.')
source.close()
call_command('migrate', interactive=False, verbosity=0)
connections.close_all()
with sqlite3.connect(STAGED) as target:
    if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise RuntimeError('Integrity check failed; original database is unchanged.')
target.close()
os.replace(STAGED, SOURCE)
print('Reconciled local database. Complete backup:', backup_path.name)
print('Preserved records:', counts)
