import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    DEBUG = True
    # CORS configuration to allow a React front-end to access the back-end.
    CORS_HEADERS = 'Content-Type'
    CORS_ORIGINS = [
        'http://localhost:3000',  # React default port
        'http://127.0.0.1:3000'
    ]

config = {
    'default': Config
}