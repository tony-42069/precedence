"""
Database Setup Script for Precedence

Run this to:
1. Check PostgreSQL connection
2. Create the database if needed
3. Initialize all tables

Usage:
    python setup_database.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_postgres_installed():
    """Check if psycopg2 is installed."""
    try:
        import psycopg2
        print("✅ psycopg2 is installed")
        return True
    except ImportError:
        print("❌ psycopg2 not installed. Run: pip install psycopg2-binary")
        return False


def create_database():
    """Create the precedence_db database if it doesn't exist."""
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    
    # Connect to default postgres database to create our database
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = 'precedence_db'")
        exists = cursor.fetchone()
        
        if not exists:
            cursor.execute("CREATE DATABASE precedence_db")
            print("✅ Created database: precedence_db")
        else:
            print("✅ Database precedence_db already exists")
        
        cursor.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print(f"❌ Cannot connect to PostgreSQL: {e}")
        print("\nMake sure PostgreSQL is running:")
        print("  - Windows: Check Services for 'postgresql'")
        print("  - Or run: pg_ctl start")
        return False


def init_tables():
    """Initialize all database tables."""
    # Update DATABASE_URL to point to PostgreSQL
    os.environ["DATABASE_URL"] = f"postgresql://postgres:{os.getenv('POSTGRES_PASSWORD', 'postgres')}@localhost:5432/precedence_db"
    
    # Import after setting DATABASE_URL
    from api.db.connection import init_db, engine
    from api.db.models import Base
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully")
        
        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n📋 Tables in database:")
        for table in tables:
            print(f"   - {table}")
        
        return True
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return False


def update_env_file():
    """Update .env file with PostgreSQL connection string."""
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Comment out SQLite and uncomment PostgreSQL
    if 'DATABASE_URL=sqlite' in content:
        password = os.getenv('POSTGRES_PASSWORD', 'postgres')
        new_content = content.replace(
            'DATABASE_URL=sqlite:///./precedence_dev.db',
            f'# DATABASE_URL=sqlite:///./precedence_dev.db\nDATABASE_URL=postgresql://postgres:{password}@localhost:5432/precedence_db'
        )
        
        with open(env_path, 'w') as f:
            f.write(new_content)
        
        print("✅ Updated .env with PostgreSQL connection string")
    else:
        print("✅ .env already configured for PostgreSQL")


def main():
    print("=" * 60)
    print("Precedence Database Setup")
    print("=" * 60)
    print()
    
    # Step 1: Check psycopg2
    if not check_postgres_installed():
        print("\nPlease install psycopg2-binary and try again.")
        sys.exit(1)
    
    # Step 2: Create database
    print()
    if not create_database():
        print("\nPlease start PostgreSQL and try again.")
        sys.exit(1)
    
    # Step 3: Update .env
    print()
    update_env_file()
    
    # Step 4: Initialize tables
    print()
    if not init_tables():
        print("\nFailed to initialize tables.")
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ Database setup complete!")
    print("=" * 60)
    print()
    print("You can now start the backend with:")
    print("  uvicorn api.main:app --reload --port 8000")
    print()


if __name__ == "__main__":
    main()
