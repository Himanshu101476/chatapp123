from flask import render_template, redirect, url_for, request, jsonify, flash
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db, login_manager
from models import User, Message
from datetime import datetime

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.route('/')
@login_required
def chat():
    users = User.query.filter(User.id != current_user.id).all()
    return render_template('chat.html', users=users)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        user = User.query.filter_by(email=request.form['email']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            return redirect(url_for('chat'))
        flash('Invalid email or password')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('chat'))
    
    if request.method == 'POST':
        if User.query.filter_by(email=request.form['email']).first():
            flash('Email already registered')
            return redirect(url_for('register'))
        
        if User.query.filter_by(username=request.form['username']).first():
            flash('Username already taken')
            return redirect(url_for('register'))
        
        user = User(
            username=request.form['username'],
            email=request.form['email']
        )
        user.set_password(request.form['password'])
        db.session.add(user)
        db.session.commit()
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/api/messages/<int:user_id>')
@login_required
def get_messages(user_id):
    messages = Message.query.filter(
        ((Message.sender_id == current_user.id) & (Message.recipient_id == user_id)) |
        ((Message.sender_id == user_id) & (Message.recipient_id == current_user.id))
    ).order_by(Message.timestamp.asc()).all()

    return jsonify([{
        'id': m.id,
        'content': m.content,
        'sender_id': m.sender_id,
        'sender_username': m.sender.username,
        'timestamp': m.timestamp.isoformat()
    } for m in messages])

@app.route('/api/messages', methods=['POST'])
@login_required
def send_message():
    data = request.json
    message = Message(
        sender_id=current_user.id,
        recipient_id=data['recipient_id'],
        content=data['content']
    )
    db.session.add(message)
    db.session.commit()
    return jsonify({
        'id': message.id,
        'content': message.content,
        'sender_id': message.sender_id,
        'sender_username': message.sender.username,
        'timestamp': message.timestamp.isoformat()
    })

@app.route('/api/users/status')
@login_required
def get_user_status():
    users = User.query.filter(User.id != current_user.id).all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'online': (datetime.utcnow() - user.last_seen).total_seconds() < 300
    } for user in users])

@app.before_request
def update_last_seen():
    if current_user.is_authenticated:
        current_user.last_seen = datetime.utcnow()
        db.session.commit()