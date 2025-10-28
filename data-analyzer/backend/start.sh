#!/usr/bin/env bash
# Start script for Render

uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
