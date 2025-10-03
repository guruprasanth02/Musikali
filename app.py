from flask import Flask, render_template, jsonify, request, session, redirect, url_for
import random
import os

app = Flask(__name__)
app.secret_key = 'supersecretkey'

# Dummy user for demonstration
USERS = {
    'user': 'password',  # username: password
    'music': '123'
}

# Configure static folder for audio files
app.static_folder = 'static'

# Notes for the games
NOTES = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni', 'Sa2', 'Re2', 'Ga2', 'Ma2', 'Pa2']
LEVELS = {
    1: {'pattern_length': 3, 'points': 10},
    2: {'pattern_length': 5, 'points': 20},
    3: {'pattern_length': 7, 'points': 30},
}

# Navarasa emotions and corresponding audio files
NAVARASA_AUDIO = {
    "Shanta": "static/audio/shanta.mp3",
    "Veera": "static/audio/veera.mp3",
    "Shringara": "static/audio/shringara.mp3",
    "Karuna": "static/audio/karuna.mp3",
    "Adbhuta": "static/audio/adbhuta.mp3",
    "Bhayanaka": "static/audio/bhayanaka.mp3"

}
#"Hasya": "static/audio/hasya.mp3", "Bibhatsa": "static/audio/bibhatsa.mp3","Raudra": "static/audio/raudra.mp3",

# Login route (moved to /login)
@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'username' in session:
        return redirect(url_for('home'))
    error = None
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username in USERS and USERS[username] == password:
            session['username'] = username
            return redirect(url_for('home'))
        else:
            error = 'Invalid username or password.'
    return render_template('login.html', error=error)


# Root route: redirect to login or home
@app.route('/')
def root():
    if 'username' in session:
        return redirect(url_for('home'))
    return redirect(url_for('login'))

# Logout route
@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))


# Home route (main app)
@app.route('/home')
def home():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('Home.html')

# Practice route
@app.route('/practice')
def practice():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('practice.html')

# Pattern Recognition route
@app.route('/pattern')
def pattern():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('pattern.html')

# Compose Pattern route
@app.route('/compose')
def compose():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('compose.html')

# Sour Note route
@app.route('/sour')
def sour():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('sour.html')

# Pattern Recognition Game
@app.route('/generate_pattern', methods=['POST'])
def generate_pattern():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    level = int(request.json.get('level', 1))
    pattern_length = LEVELS[level]['pattern_length']
    pattern = random.sample(NOTES, pattern_length)
    return jsonify({
        'pattern': pattern,
        'points': LEVELS[level]['points']
    })

@app.route('/check_answer', methods=['POST'])
def check_answer():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    user_pattern = data.get('user_pattern', [])
    correct_pattern = data.get('correct_pattern', [])
    is_correct = user_pattern == correct_pattern
    return jsonify({
        'correct': is_correct,
        'points': LEVELS[int(data.get('level', 1))]['points'] if is_correct else 0
    })

# Identify the Sour Note Game
@app.route('/generate_sour_note_melody', methods=['POST'])
def generate_sour_note_melody():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    melody_length = 5  # Number of notes in the melody
    melody = random.choices(NOTES, k=melody_length)
    sour_index = random.randint(0, melody_length - 1)
    sour_note = f"{melody[sour_index]}_sour"
    melody[sour_index] = sour_note

    return jsonify({
        'melody': melody,
        'sour_index': sour_index  # This is for frontend verification
    })

@app.route('/check_sour_note', methods=['POST'])
def check_sour_note():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    guessed_index = data.get('guessed_index')
    correct_index = data.get('correct_index')

    if guessed_index == correct_index:
        return jsonify({'correct': True, 'message': 'Correct! You identified the sour note!'})
    return jsonify({'correct': False, 'message': 'Incorrect! Try again.'})

# Navarasa Emotion Game
@app.route('/navarasa')
def navarasa():
    if 'username' not in session:
        return redirect(url_for('login'))
    session['score'] = 0
    session['questions'] = list(NAVARASA_AUDIO.items())
    random.shuffle(session['questions'])
    return render_template('navarasa.html')

@app.route('/get_question', methods=['GET'])
def get_question():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    session['questions'] = session.get('questions', list(NAVARASA_AUDIO.items()))
    random.shuffle(session['questions'])

    if session['questions']:
        emotion, audio_path = session['questions'].pop()
        session['current_emotion'] = emotion
        return jsonify({"audio": audio_path, "options": list(NAVARASA_AUDIO.keys())})
    else:
        return jsonify({"audio": None, "options": None})

@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    user_answer = data['answer']
    correct_answer = session.get('current_emotion', '')

    if user_answer == correct_answer:
        session['score'] = session.get('score', 0) + 1

    return jsonify({
        "correct": user_answer == correct_answer,
        "correct_answer": correct_answer,
        "score": session.get('score', 0)
    })

# Run the app
if __name__ == '__main__':
    app.run(debug=True)