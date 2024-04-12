import typer
from typing import Optional
from typing_extensions import Annotated
import re
from .config import set_config_value, get_config
from .auth import Auth
from .connect import Connect
from .database import Database

import pkg_resources  # part of setuptools

def parseName(name):
  if re.search('\/', name):
    parts = name.split('/')
    return {
      'organization': parts[0],
      'database': parts[1],
      'path' : name
    }
  return {
    'organization': '_',
    'database': name,
    'path' : f"_/{name}"
  }

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

database_cmds = typer.Typer()
app.add_typer(database_cmds, name='database', help='PG Farm database view/edit commands')

@database_cmds.command()
def list(
  mine: Annotated[bool, typer.Option(help="Only show databases you own")] = False,
  json: Annotated[bool, typer.Option(help="Output as JSON")] = False
):
  """List databases"""
  db = Database()
  db.list({'mine':mine, 'json':json})

@database_cmds.command("set-metadata")
def set_metadata(
  name: Annotated[str, typer.Argument()],
  title: Annotated[str, typer.Option("--title", "-t", help="Title of the database")] = None,
  description: Annotated[str, typer.Option("--description", "-d", help="Description of the database")] = None,
  short_description: Annotated[str, typer.Option("--short-description", "-s", help="Short description of the database")] = None,
  url: Annotated[str, typer.Option("--url", "-u", help="URL of the database")] = None,
  tags: Annotated[str, typer.Option("--tags", "-l", help="Comma separated list of tags")] = None,
):
  """Set database metadata"""
  db = Database()
  name = parseName(name)
  tags = [tag.strip() for tag in tags.split(',')]
  metadata = {
    'title': title,
    'description': description,
    'shortDescription': short_description,
    'url': url,
    'tags': tags
  }

  db.set_metadata(name, metadata)

@database_cmds.command("link")
def link(
  name: str,
  link: str,
):
  """Link a remote database to a local database using foreign data wrappers"""
  db = Database()
  name = parseName(name)
  link = parseName(link)
  db.link(name, link)

def version_callback(value: bool):
    if value:
        version = pkg_resources.require("pgfarm")[0].version
        print(f"v{version}")
        raise typer.Exit()

@app.callback()
def common(
    ctx: typer.Context,
    version: bool = typer.Option(None, "--version", callback=version_callback),
):
    pass

if __name__ == "__main__":
    app()