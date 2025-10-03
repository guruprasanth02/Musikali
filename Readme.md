# Musiக்களி 🎶

Musiக்களி is a web-based music learning and quiz platform built with Flask. It features interactive games and exercises to help users practice and recognize musical notes, patterns, and emotions (Navarasa) in music.

## Features

- **User Authentication:** Simple login/logout system with session management.
- **Practice Mode:** Practice musical notes.
- **Pattern Recognition Game:** Identify note patterns of increasing difficulty.
- **Compose Pattern:** Compose your own note patterns.
- **Sour Note Game:** Identify the "sour" (incorrect) note in a melody.
- **Navarasa Emotion Game:** Listen to audio clips and identify the corresponding emotion (Navarasa).
- **Score Tracking:** Scores are tracked for certain games.

## Folder Structure

```
d:/Musiக்களி/
│
├── app.py                  # Main Flask application
├── static/
│   └── audio/              # Audio files for Navarasa and games
├── templates/
│   ├── Home.html
│   ├── login.html
│   ├── practice.html
│   ├── pattern.html
│   ├── compose.html
│   ├── sour.html
│   └── navarasa.html
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.x
- Flask

### Installation

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/musikkali.git
    cd Musiக்களி
    ```

2. **Install dependencies:**
    ```sh
    pip install flask
    ```

3. **Add audio files:**
    - Place your audio files for Navarasa and other games in `static/audio/`.

4. **Run the app:**
    ```sh
    python app.py
    ```
    - The app will be available at `http://127.0.0.1:5000/`

### Default Users

| Username | Password |
|----------|----------|
| user     | password |
| music    | 123      |

## Usage

- Visit `/login` to log in.
- Navigate through the Home page to access different games and practice modes.
- Play games, practice, and track your score!

## Customization

- **Add More Users:** Edit the `USERS` dictionary in `app.py`.
- **Add More Notes/Levels:** Edit the `NOTES` and `LEVELS` variables.
- **Add More Emotions/Audio:** Update the `NAVARASA_AUDIO` dictionary and add corresponding audio files.

## License

This project is for educational purposes.

---

*Made with ❤️ using Flask*
