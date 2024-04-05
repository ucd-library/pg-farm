import typer
from typing import Optional
from typing_extensions import Annotated
from .config import set_config_value, get_config
from .auth import Auth
from .connect import Connect

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

auth_cmds = typer.Typer()
app.add_typer(auth_cmds, name='auth', help='Login or show auth tokens')

@auth_cmds.command()
def login():
  """Login to PG Farm"""
  auth = Auth()
  auth.login()

@auth_cmds.command()
def token(jwt: Annotated[bool, typer.Option("--jwt", "-j", help="Print JWT")] = False):
  """Print the access token or JWT token.  This token should be used as your password"""
  auth = Auth()
  print(auth.get_token(jwt=jwt))

connect_cmds = typer.Typer()
app.add_typer(connect_cmds, name='connect', help='Helper methods for connecting to PG Farm database')

@connect_cmds.command()
def json(dbname: Annotated[Optional[str], typer.Argument()] = None):
  """Show connection data as JSON object"""
  con = Connect()
  con.json(dbname)

@connect_cmds.command()
def psql(
  dbname: Annotated[Optional[str], typer.Argument()] = None,
  pass_prompt: Annotated[bool, typer.Option(help="Do not include password in command, use env variable")] = False,
  pgservice: Annotated[bool, typer.Option(help="Use PGSERVICE set by pgfarm auth login ")] = False,
  pgstr: Annotated[bool, typer.Option(help="Use psql string instead of psql flags")] = False
):
  """Show psql command"""
  con = Connect()
  con.psql(dbname, pass_prompt, pgservice, pgstr)

@connect_cmds.command()
def uri(dbname: Annotated[Optional[str], typer.Argument()] = None):
  """Show connection URI"""
  con = Connect()
  con.uri(dbname)

@connect_cmds.command()
def yaml(dbname: Annotated[Optional[str], typer.Argument()] = None):
  """Show connection data as YAML object"""
  con = Connect()
  con.yaml(dbname)