# setup.py

from setuptools import find_packages, setup

setup(
    name='pgfarm',
    version='0.0.1',
    packages=find_packages(),
    install_requires=[
        'typer==0.9.0',
        'pyyaml==6.0.1',
        'chevron==0.14.0',
    ],
    entry_points={
        'console_scripts': [
            'pgfarm=src.cli:app'
        ]
    }
)