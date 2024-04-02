import typer
from typing_extensions import Annotated
from .model import CloudFVSConductor
from .config import set_config_value, get_config

app = typer.Typer()

config_cmds = typer.Typer()
app.add_typer(config_cmds, name='config', help='Setup CLI')

@config_cmds.command()
def set(key: str, value: str):
  """Set a configuration value"""
  set_config_value(key, value)

@config_cmds.command()
def show():
  """Show configuration"""
  config = get_config()
  for key, value in config.items():
    print(f"{key}: {value}")

@app.command()
def login():
  """Login to conductor application"""
  cloudFVSConductor = CloudFVSConductor()
  cloudFVSConductor.login()