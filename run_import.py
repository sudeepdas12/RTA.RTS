#!/usr/bin/env python
"""Runner script that patches the path and runs the import"""
import os, sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Read and patch the import script
script_path = '/app/import_prime_debenture.py'
with open(script_path, 'r') as f:
    code = f.read()

# Replace the Windows path with the container path
code = code.replace(
    r"C:\Users\Administrator\OneDrive\Desktop\PRIME 8.75 POUSH END 2082_CALCULATION - FINAL.xlsx",
    '/app/prime_data.xlsx'
)

exec(code)