import os


def admin_workspace(request):
    return {'workspace_frontend_url': os.getenv('FRONTEND_URL', 'http://127.0.0.1:5175/')}
