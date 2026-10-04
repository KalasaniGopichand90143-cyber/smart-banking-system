import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()


def get_connection():

    config = {
        "host": os.getenv("DB_HOST"),
        "port": int(os.getenv("DB_PORT")),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "database": os.getenv("DB_NAME")
    }

    # Use Aiven SSL only in production
    if os.getenv("ENVIRONMENT") == "production":
        config["ssl_ca"] = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "aiven-ca.pem"
        )

    return mysql.connector.connect(**config)