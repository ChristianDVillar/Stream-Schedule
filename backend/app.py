from flask import Flask, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///streamer_scheduler.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app, supports_credentials=True)
login_manager = LoginManager()
login_manager.init_app(app)

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    twitch_token = db.Column(db.Text)
    twitter_token = db.Column(db.Text)
    instagram_token = db.Column(db.Text)
    discord_token = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    scheduled_contents = db.relationship('ScheduledContent', backref='user', lazy=True)

class ScheduledContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.String(50), default='text')
    platforms = db.Column(db.Text, default='[]')  # JSON string
    scheduled_for = db.Column(db.DateTime, nullable=False)
    hashtags = db.Column(db.Text)
    mentions = db.Column(db.Text)
    files = db.Column(db.Text, default='[]')  # JSON string
    status = db.Column(db.String(20), default='pending')
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Backend is running'})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    user = User(
        username=data['username'],
        email=data['email'],
        password_hash=data['password']  # In production, hash the password
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).first()
    
    if user and user.password_hash == data['password']:  # In production, verify hash
        login_user(user)
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout successful'})

@app.route('/api/auth/profile', methods=['GET'])
@login_required
def get_profile():
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'email': current_user.email,
        'platforms': {
            'twitch': bool(current_user.twitch_token),
            'twitter': bool(current_user.twitter_token),
            'instagram': bool(current_user.instagram_token),
            'discord': bool(current_user.discord_token)
        }
    })

@app.route('/api/content', methods=['GET'])
@login_required
def get_content():
    contents = ScheduledContent.query.filter_by(user_id=current_user.id).order_by(ScheduledContent.scheduled_for.desc()).all()
    
    return jsonify([{
        'id': content.id,
        'title': content.title,
        'content': content.content,
        'content_type': content.content_type,
        'platforms': content.platforms,
        'scheduled_for': content.scheduled_for.isoformat(),
        'hashtags': content.hashtags,
        'mentions': content.mentions,
        'files': content.files,
        'status': content.status,
        'created_at': content.created_at.isoformat()
    } for content in contents])

@app.route('/api/content', methods=['POST'])
@login_required
def create_content():
    data = request.get_json()
    
    content = ScheduledContent(
        title=data['title'],
        content=data['content'],
        content_type=data.get('content_type', 'text'),
        platforms=data.get('platforms', '[]'),
        scheduled_for=datetime.fromisoformat(data['scheduled_for']),
        hashtags=data.get('hashtags'),
        mentions=data.get('mentions'),
        files=data.get('files', '[]'),
        user_id=current_user.id
    )
    
    db.session.add(content)
    db.session.commit()
    
    return jsonify({
        'id': content.id,
        'message': 'Content scheduled successfully'
    }), 201

@app.route('/api/content/<int:content_id>', methods=['PUT'])
@login_required
def update_content(content_id):
    content = ScheduledContent.query.filter_by(id=content_id, user_id=current_user.id).first()
    
    if not content:
        return jsonify({'error': 'Content not found'}), 404
    
    data = request.get_json()
    
    content.title = data.get('title', content.title)
    content.content = data.get('content', content.content)
    content.content_type = data.get('content_type', content.content_type)
    content.platforms = data.get('platforms', content.platforms)
    content.scheduled_for = datetime.fromisoformat(data['scheduled_for']) if 'scheduled_for' in data else content.scheduled_for
    content.hashtags = data.get('hashtags', content.hashtags)
    content.mentions = data.get('mentions', content.mentions)
    content.files = data.get('files', content.files)
    
    db.session.commit()
    
    return jsonify({'message': 'Content updated successfully'})

@app.route('/api/content/<int:content_id>', methods=['DELETE'])
@login_required
def delete_content(content_id):
    content = ScheduledContent.query.filter_by(id=content_id, user_id=current_user.id).first()
    
    if not content:
        return jsonify({'error': 'Content not found'}), 404
    
    db.session.delete(content)
    db.session.commit()
    
    return jsonify({'message': 'Content deleted successfully'})

@app.route('/api/platforms/connect/<platform>', methods=['POST'])
@login_required
def connect_platform(platform):
    data = request.get_json()
    token = data.get('token')
    
    if platform == 'twitch':
        current_user.twitch_token = token
    elif platform == 'twitter':
        current_user.twitter_token = token
    elif platform == 'instagram':
        current_user.instagram_token = token
    elif platform == 'discord':
        current_user.discord_token = token
    else:
        return jsonify({'error': 'Invalid platform'}), 400
    
    db.session.commit()
    
    return jsonify({'message': f'{platform} connected successfully'})

@app.route('/api/platforms/disconnect/<platform>', methods=['POST'])
@login_required
def disconnect_platform(platform):
    if platform == 'twitch':
        current_user.twitch_token = None
    elif platform == 'twitter':
        current_user.twitter_token = None
    elif platform == 'instagram':
        current_user.instagram_token = None
    elif platform == 'discord':
        current_user.discord_token = None
    else:
        return jsonify({'error': 'Invalid platform'}), 400
    
    db.session.commit()
    
    return jsonify({'message': f'{platform} disconnected successfully'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000) 