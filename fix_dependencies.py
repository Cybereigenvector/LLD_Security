import subprocess
import sys

print("Fixing Flask dependencies...")

# Uninstall conflicting packages
subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "flask", "werkzeug"])

# Install compatible versions
subprocess.run([sys.executable, "-m", "pip", "install", "flask==2.0.1", "werkzeug==2.0.3", "flask-cors==3.0.10"])

print("Dependencies fixed. Try running 'python app.py' again.") 