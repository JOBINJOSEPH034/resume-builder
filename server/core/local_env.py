"""Load ignored local backend settings without replacing deployment environment values."""
import os
import re


def load_local_env(path):
    if not path.is_file():
        return
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line=line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name,value=line.split('=',1)
        name=name.strip();value=value.strip()
        if not re.fullmatch(r'[A-Z][A-Z0-9_]*',name):
            continue
        if len(value)>=2 and value[0]==value[-1] and value[0] in ('"',"'"):
            value=value[1:-1]
        os.environ.setdefault(name,value)
