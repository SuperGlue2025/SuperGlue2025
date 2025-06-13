import os, sqlite3, io, random, string, datetime, base64
from flask import Blueprint, jsonify, request, session
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
from PIL import Image, ImageDraw, ImageFont

bcrypt      = Bcrypt()       
jwt         = JWTManager()
auth_bp     = Blueprint('auth', __name__)
DB_PATH     = os.path.join(os.path.dirname(__file__), 'data', 'users.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

# ---------- DB helper ----------
def init_user_db():
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""CREATE TABLE IF NOT EXISTS users(
                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                         email TEXT UNIQUE NOT NULL,
                         password TEXT NOT NULL,
                         created_at TEXT)""")
init_user_db()

def user_by_email(email):
    with sqlite3.connect(DB_PATH) as con:
        cur = con.execute("SELECT id,email,password FROM users WHERE email=?", (email,))
        return cur.fetchone()

# ---------- captcha ----------
def _captcha_text(n=4):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=n))

def _captcha_img(text):
    img = Image.new('RGB', (120, 50), 'white')
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    draw.text((15, 8), text, font=font, fill='black')
    for _ in range(25):
        x, y = random.randint(0, 119), random.randint(0, 49)
        draw.point((x, y), fill='black')
    buf = io.BytesIO()
    img.save(buf, format='PNG'); buf.seek(0)
    return 'data:image/png;base64,' + base64.b64encode(buf.read()).decode()

@auth_bp.get('/captcha')
def get_captcha():
    txt = _captcha_text()
    cid = ''.join(random.choices(string.ascii_letters+string.digits, k=16))
    session['captcha_'+cid] = txt
    return jsonify(success=True, captcha_id=cid, image=_captcha_img(txt))

def _verify_cap(cid, user_input):
    real = session.pop('captcha_'+cid, None)
    return real and user_input.upper() == real.upper()

# ---------- register ----------
@auth_bp.post('/register')
def register():
    data = request.get_json(force=True)
    for k in ('email','password','captcha','captcha_id'):
        if not data.get(k): return jsonify(success=False, error=f"Missing {k}"), 400
    if not _verify_cap(data['captcha_id'], data['captcha']):
        return jsonify(success=False, error="Captcha incorrect"), 400
    email = data['email'].strip().lower()
    if user_by_email(email):
        return jsonify(success=False, error="Email already registered"), 409
    pw_hash = bcrypt.generate_password_hash(data['password']).decode()
    with sqlite3.connect(DB_PATH) as con:
        con.execute("INSERT INTO users(email,password,created_at) VALUES(?,?,?)",
                    (email, pw_hash, datetime.datetime.utcnow().isoformat()))
    return jsonify(success=True, msg="registered")

# ---------- login ----------
@auth_bp.post('/login')
def login():
    data = request.get_json(force=True)
    for k in ('email','password','captcha','captcha_id'):
        if not data.get(k): return jsonify(success=False, error=f"Missing {k}"), 400
    if not _verify_cap(data['captcha_id'], data['captcha']):
        return jsonify(success=False, error="Wrong Captcha "), 400
    row = user_by_email(data['email'].strip().lower())
    if not row or not bcrypt.check_password_hash(row[2], data['password']):
        return jsonify(success=False, error="Invalid Email Or Password"), 401
    token = create_access_token(identity=row[0])
    return jsonify(success=True, token=token, email=row[1])

# ---------- just for test ----------
@auth_bp.get('/whoami')
@jwt_required()
def whoami():
    return jsonify(uid=get_jwt_identity())
