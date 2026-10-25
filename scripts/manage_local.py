"""Run Django with the bundled Python and existing pure-Python dependencies."""
from pathlib import Path
import runpy
import sys
root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.runtime' / 'python-deps'))
sys.path.append(str(root / 'venv' / 'Lib' / 'site-packages'))
sys.path.insert(0, str(root / 'server'))
runpy.run_path(str(root / 'server' / 'manage.py'), run_name='__main__')
