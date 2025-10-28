#!/usr/bin/env python3
"""
Data Analyzer Application Runner
Starts both backend and frontend servers
"""

import subprocess
import sys
import os
import time
import signal
from pathlib import Path

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_colored(text, color):
    """Print colored text to terminal"""
    print(f"{color}{text}{Colors.END}")

def print_banner():
    """Print application banner"""
    banner = """
    ╔═══════════════════════════════════════════════╗
    ║     Data Analyzer Application Runner          ║
    ╚═══════════════════════════════════════════════╝
    """
    print_colored(banner, Colors.CYAN + Colors.BOLD)

def check_dependencies():
    """Check if required dependencies are installed"""
    print_colored("\n[INFO] Checking dependencies...", Colors.YELLOW)

    # Check Python
    try:
        python_version = sys.version.split()[0]
        print_colored(f"  ✓ Python {python_version}", Colors.GREEN)
    except:
        print_colored("  ✗ Python not found", Colors.RED)
        return False

    # Check Node/npm
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=True)
        if result.returncode == 0:
            npm_version = result.stdout.strip()
            print_colored(f"  ✓ npm {npm_version}", Colors.GREEN)
        else:
            print_colored("  ✗ npm not found", Colors.RED)
            return False
    except:
        print_colored("  ✗ npm not found", Colors.RED)
        return False

    return True

def install_backend_deps():
    """Install backend Python dependencies"""
    backend_dir = Path(__file__).parent / "data-analyzer" / "backend"
    requirements_file = backend_dir / "requirements.txt"

    if not requirements_file.exists():
        print_colored(f"  ✗ requirements.txt not found at {requirements_file}", Colors.RED)
        return False

    print_colored("\n[INFO] Installing backend dependencies...", Colors.YELLOW)
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)],
                      check=True)
        print_colored("  ✓ Backend dependencies installed", Colors.GREEN)
        return True
    except subprocess.CalledProcessError:
        print_colored("  ✗ Failed to install backend dependencies", Colors.RED)
        print_colored("  Try running: pip install -r data-analyzer/backend/requirements.txt", Colors.YELLOW)
        return False

def install_frontend_deps():
    """Install frontend npm dependencies"""
    frontend_dir = Path(__file__).parent / "data-analyzer" / "frontend"
    node_modules = frontend_dir / "node_modules"

    if node_modules.exists():
        print_colored("  ✓ Frontend dependencies already installed", Colors.GREEN)
        return True

    print_colored("\n[INFO] Installing frontend dependencies...", Colors.YELLOW)
    try:
        subprocess.run(["npm", "install"], cwd=str(frontend_dir), check=True, shell=True)
        print_colored("  ✓ Frontend dependencies installed", Colors.GREEN)
        return True
    except subprocess.CalledProcessError:
        print_colored("  ✗ Failed to install frontend dependencies", Colors.RED)
        return False

def start_backend():
    """Start the backend server"""
    backend_dir = Path(__file__).parent / "data-analyzer" / "backend"
    main_file = backend_dir / "main.py"

    if not main_file.exists():
        print_colored(f"  ✗ Backend main.py not found at {main_file}", Colors.RED)
        return None

    print_colored("\n[1/2] Starting Backend Server...", Colors.BLUE + Colors.BOLD)
    print_colored(f"  → Location: {backend_dir}", Colors.CYAN)
    print_colored(f"  → URL: http://localhost:8000", Colors.CYAN)

    try:
        # Start backend process
        process = subprocess.Popen(
            [sys.executable, str(main_file)],
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Wait a moment and check if process started
        time.sleep(2)
        if process.poll() is None:
            print_colored("  ✓ Backend server started successfully", Colors.GREEN)
            return process
        else:
            print_colored("  ✗ Backend server failed to start", Colors.RED)
            return None

    except Exception as e:
        print_colored(f"  ✗ Error starting backend: {str(e)}", Colors.RED)
        return None

def start_frontend():
    """Start the frontend development server"""
    frontend_dir = Path(__file__).parent / "data-analyzer" / "frontend"

    print_colored("\n[2/2] Starting Frontend Development Server...", Colors.BLUE + Colors.BOLD)
    print_colored(f"  → Location: {frontend_dir}", Colors.CYAN)
    print_colored(f"  → URL: http://localhost:5173", Colors.CYAN)

    try:
        # Start frontend process
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True,
            shell=True
        )

        # Wait a moment and check if process started
        time.sleep(2)
        if process.poll() is None:
            print_colored("  ✓ Frontend server started successfully", Colors.GREEN)
            return process
        else:
            print_colored("  ✗ Frontend server failed to start", Colors.RED)
            return None

    except Exception as e:
        print_colored(f"  ✗ Error starting frontend: {str(e)}", Colors.RED)
        return None

def monitor_processes(backend_process, frontend_process):
    """Monitor running processes and handle shutdown"""
    print_colored("\n" + "="*50, Colors.GREEN)
    print_colored("  Application Started Successfully!", Colors.GREEN + Colors.BOLD)
    print_colored("="*50, Colors.GREEN)
    print_colored("\n  Backend:  http://localhost:8000", Colors.CYAN)
    print_colored("  Frontend: http://localhost:5173", Colors.CYAN)
    print_colored("\n  Press Ctrl+C to stop all servers\n", Colors.YELLOW)

    def signal_handler(sig, frame):
        print_colored("\n\n[INFO] Shutting down servers...", Colors.YELLOW)

        if backend_process and backend_process.poll() is None:
            print_colored("  → Stopping backend...", Colors.YELLOW)
            backend_process.terminate()
            try:
                backend_process.wait(timeout=5)
                print_colored("  ✓ Backend stopped", Colors.GREEN)
            except subprocess.TimeoutExpired:
                backend_process.kill()
                print_colored("  ✓ Backend force stopped", Colors.GREEN)

        if frontend_process and frontend_process.poll() is None:
            print_colored("  → Stopping frontend...", Colors.YELLOW)
            frontend_process.terminate()
            try:
                frontend_process.wait(timeout=5)
                print_colored("  ✓ Frontend stopped", Colors.GREEN)
            except subprocess.TimeoutExpired:
                frontend_process.kill()
                print_colored("  ✓ Frontend force stopped", Colors.GREEN)

        print_colored("\n  All servers stopped. Goodbye!", Colors.GREEN + Colors.BOLD)
        sys.exit(0)

    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Keep the script running and monitor processes
    try:
        while True:
            time.sleep(1)

            # Check if processes are still running
            if backend_process and backend_process.poll() is not None:
                print_colored("\n[ERROR] Backend server stopped unexpectedly!", Colors.RED)
                if frontend_process:
                    frontend_process.terminate()
                sys.exit(1)

            if frontend_process and frontend_process.poll() is not None:
                print_colored("\n[ERROR] Frontend server stopped unexpectedly!", Colors.RED)
                if backend_process:
                    backend_process.terminate()
                sys.exit(1)

    except KeyboardInterrupt:
        signal_handler(None, None)

def main():
    """Main entry point"""
    print_banner()

    # Check dependencies
    if not check_dependencies():
        print_colored("\n[ERROR] Dependency check failed!", Colors.RED)
        sys.exit(1)

    # Check if we need to install dependencies
    backend_dir = Path(__file__).parent / "data-analyzer" / "backend"
    frontend_dir = Path(__file__).parent / "data-analyzer" / "frontend"

    if not backend_dir.exists() or not frontend_dir.exists():
        print_colored("\n[ERROR] Project structure not found!", Colors.RED)
        print_colored(f"  Expected: {Path(__file__).parent / 'data-analyzer'}", Colors.YELLOW)
        sys.exit(1)

    # Ask user if they want to install dependencies
    try:
        response = input("\nInstall/update dependencies? (y/n, default=n): ").lower()
        if response == 'y':
            if not install_backend_deps():
                print_colored("\n[ERROR] Backend dependency installation failed!", Colors.RED)
                sys.exit(1)
            if not install_frontend_deps():
                print_colored("\n[ERROR] Frontend dependency installation failed!", Colors.RED)
                sys.exit(1)
    except:
        pass

    # Start servers
    backend_process = start_backend()
    if not backend_process:
        print_colored("\n[ERROR] Failed to start backend server!", Colors.RED)
        sys.exit(1)

    frontend_process = start_frontend()
    if not frontend_process:
        print_colored("\n[ERROR] Failed to start frontend server!", Colors.RED)
        if backend_process:
            backend_process.terminate()
        sys.exit(1)

    # Monitor processes
    monitor_processes(backend_process, frontend_process)

if __name__ == "__main__":
    main()
