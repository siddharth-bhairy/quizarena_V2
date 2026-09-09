"""Populates the questions table with sample Math and Geography questions.
Run once with: python seed_data.py
"""
from database import SessionLocal, engine, Base
import models

Base.metadata.create_all(bind=engine)

MATH_QUESTIONS = [
    ("What is 7 + 8?", ["13", "15", "17", "16"], 1, "easy"),
    ("What is 12 x 6?", ["66", "72", "78", "82"], 1, "easy"),
    ("What is 144 / 12?", ["10", "11", "12", "14"], 2, "easy"),
    ("What is the square root of 81?", ["7", "8", "9", "10"], 2, "medium"),
    ("What is 15% of 200?", ["20", "25", "30", "35"], 2, "medium"),
    ("Solve: 3x = 27, x = ?", ["6", "7", "8", "9"], 3, "medium"),
    ("What is 9 squared?", ["72", "81", "90", "99"], 1, "easy"),
    ("What is 2^10?", ["512", "1024", "2048", "256"], 1, "hard"),
    ("What is the value of Pi to 2 decimal places?", ["3.14", "3.41", "3.12", "3.16"], 0, "easy"),
    ("What is 17 - 9?", ["6", "7", "8", "9"], 2, "easy"),
]

GEOGRAPHY_QUESTIONS = [
    ("What is the capital of France?", ["Berlin", "Madrid", "Paris", "Rome"], 2, "easy"),
    ("Which is the largest continent by area?", ["Africa", "Asia", "Europe", "Antarctica"], 1, "easy"),
    ("Which river is the longest in the world?", ["Amazon", "Nile", "Yangtze", "Mississippi"], 1, "medium"),
    ("Mount Everest is located in which country?", ["India", "China", "Nepal", "Bhutan"], 2, "medium"),
    ("What is the capital of Japan?", ["Osaka", "Kyoto", "Tokyo", "Yokohama"], 2, "easy"),
    ("Which country has the largest population?", ["USA", "India", "China", "Indonesia"], 1, "medium"),
    ("The Sahara Desert is located on which continent?", ["Asia", "Africa", "Australia", "South America"], 1, "easy"),
    ("Which country is known as the Land of the Rising Sun?", ["China", "Korea", "Japan", "Thailand"], 2, "easy"),
    ("Which is the smallest country in the world?", ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], 1, "hard"),
    ("The Great Barrier Reef is located near which country?", ["Brazil", "Australia", "Mexico", "Indonesia"], 1, "medium"),
]


def seed():
    db = SessionLocal()
    try:
        if db.query(models.Question).count() > 0:
            print("Questions already seeded, skipping.")
            return

        for text, options, correct_idx, diff in MATH_QUESTIONS:
            db.add(models.Question(
                category="math", difficulty=diff,
                question_text=text, options=options, correct_index=correct_idx,
            ))

        for text, options, correct_idx, diff in GEOGRAPHY_QUESTIONS:
            db.add(models.Question(
                category="geography", difficulty=diff,
                question_text=text, options=options, correct_index=correct_idx,
            ))

        db.commit()
        print("Seeded questions successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
