---
description: A guide on how to use the Github CLI (gh cli) especially related to creating issues via the CLI
alwaysApply: false
---

# WORK-WITH-GITHUB-FROM-THE-COMMAND-LINE

USAGE
  gh <command> <subcommand> [flags]

CORE COMMANDS
  auth:        Authenticate gh and git with GitHub
  browse:      Open repositories, issues, pull requests, and more in the browser
  codespace:   Connect to and manage codespaces
  gist:        Manage gists
  issue:       Manage issues
  org:         Manage organizations
  pr:          Manage pull requests
  project:     Work with GitHub Projects.
  release:     Manage releases
  repo:        Manage repositories

GITHUB ACTIONS COMMANDS
  cache:       Manage GitHub Actions caches
  run:         View details about workflow runs
  workflow:    View details about GitHub Actions workflows

ALIAS COMMANDS
  co:          Alias for "pr checkout"

ADDITIONAL COMMANDS
  alias:       Create command shortcuts
  api:         Make an authenticated GitHub API request
  attestation: Work with artifact attestations
  completion:  Generate shell completion scripts
  config:      Manage configuration for gh
  extension:   Manage gh extensions
  gpg-key:     Manage GPG keys
  label:       Manage labels
  ruleset:     View info about repo rulesets
  search:      Search for repositories, issues, and pull requests
  secret:      Manage GitHub secrets
  ssh-key:     Manage SSH keys
  status:      Print information about relevant issues, pull requests, and notifications across repositories
  variable:    Manage GitHub Actions variables

HELP TOPICS
  actions:     Learn about working with GitHub Actions
  environment: Environment variables that can be used with gh
  exit-codes:  Exit codes used by gh
  formatting:  Formatting options for JSON data exported from gh
  mintty:      Information about using gh with MinTTY
  reference:   A comprehensive reference of all gh commands

FLAGS
  --help      Show help for command
  --version   Show gh version

EXAMPLES
  $ gh issue create
  $ gh repo clone cli/cli
  $ gh pr checkout 321

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`

# WORK-WITH-GIT-HUB-ISSUES

USAGE
  gh issue <command> [flags]

GENERAL COMMANDS
  create:      Create a new issue
  list:        List issues in a repository
  status:      Show status of relevant issues

TARGETED COMMANDS
  close:       Close issue
  comment:     Add a comment to an issue
  delete:      Delete issue
  develop:     Manage linked branches for an issue
  edit:        Edit issues
  lock:        Lock issue conversation
  pin:         Pin a issue
  reopen:      Reopen issue
  transfer:    Transfer issue to another repository
  unlock:      Unlock issue conversation
  unpin:       Unpin a issue
  view:        View an issue

FLAGS
  -R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

INHERITED FLAGS
  --help   Show help for command

ARGUMENTS
  An issue can be supplied as argument in any of the following formats:
  - by number, e.g. "123"; or
  - by URL, e.g. "https://github.com/OWNER/REPO/issues/123".

EXAMPLES
  $ gh issue list
  $ gh issue create --label bug
  $ gh issue view 123 --web

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`

# WORK-WITH-GIT-HUB-PULL-REQUESTS

USAGE
  gh pr <command> [flags]

GENERAL COMMANDS
  create:      Create a pull request
  list:        List pull requests in a repository
  status:      Show status of relevant pull requests

TARGETED COMMANDS
  checkout:    Check out a pull request in git
  checks:      Show CI status for a single pull request
  close:       Close a pull request
  comment:     Add a comment to a pull request
  diff:        View changes in a pull request
  edit:        Edit a pull request
  lock:        Lock pull request conversation
  merge:       Merge a pull request
  ready:       Mark a pull request as ready for review
  reopen:      Reopen a pull request
  review:      Add a review to a pull request
  unlock:      Unlock pull request conversation
  update-branch: Update a pull request branch
  view:        View a pull request

FLAGS
  -R, --repo [HOST/]OWNER/REPO   Select another repository using the [HOST/]OWNER/REPO format

INHERITED FLAGS
  --help   Show help for command

ARGUMENTS
  A pull request can be supplied as argument in any of the following formats:
  - by number, e.g. "123";
  - by URL, e.g. "https://github.com/OWNER/REPO/pull/123"; or
  - by the name of its head branch, e.g. "patch-1" or "OWNER:patch-1".

EXAMPLES
  $ gh pr checkout 353
  $ gh pr create --fill
  $ gh pr view --web

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`

# WORK-WITH-GIT-HUB-REPOSITORIES

USAGE
  gh repo <command> [flags]

GENERAL COMMANDS
  create:      Create a new repository
  list:        List repositories owned by user or organization

TARGETED COMMANDS
  archive:     Archive a repository
  autolink:    Manage autolink references
  clone:       Clone a repository locally
  delete:      Delete a repository
  deploy-key:  Manage deploy keys in a repository
  edit:        Edit repository settings
  fork:        Create a fork of a repository
  gitignore:   List and view available repository gitignore templates
  license:     Explore repository licenses
  rename:      Rename a repository
  set-default: Configure default repository for this directory
  sync:        Sync a repository
  unarchive:   Unarchive a repository
  view:        View a repository

INHERITED FLAGS
  --help   Show help for command

ARGUMENTS
  A repository can be supplied as an argument in any of the following formats:
  - "OWNER/REPO"
  - by URL, e.g. "https://github.com/OWNER/REPO"

EXAMPLES
  $ gh repo create
  $ gh repo clone cli/cli
  $ gh repo view --web

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`

# WORK-WITH-GITHUB-API

Makes an authenticated HTTP request to the GitHub API and prints the response.

The endpoint argument should either be a path of a GitHub API v3 endpoint, or
`graphql` to access the GitHub API v4.

Placeholder values `{owner}`, `{repo}`, and `{branch}` in the endpoint
argument will get replaced with values from the repository of the current
directory or the repository specified in the `GH_REPO` environment variable.
Note that in some shells, for example PowerShell, you may need to enclose
any value that contains `{...}` in quotes to prevent the shell from
applying special meaning to curly braces.

The default HTTP request method is `GET` normally and `POST` if any parameters
were added. Override the method with `--method`.

Pass one or more `-f/--raw-field` values in `key=value` format to add static string
parameters to the request payload. To add non-string or placeholder-determined values, see
`-F/--field` below. Note that adding request parameters will automatically switch the
request method to `POST`. To send the parameters as a `GET` query string instead, use
`--method GET`.

The `-F/--field` flag has magic type conversion based on the format of the value:

- literal values `true`, `false`, `null`, and integer numbers get converted to
  appropriate JSON types;
- placeholder values `{owner}`, `{repo}`, and `{branch}` get populated with values
  from the repository of the current directory;
- if the value starts with `@`, the rest of the value is interpreted as a
  filename to read the value from. Pass `-` to read from standard input.

For GraphQL requests, all fields other than `query` and `operationName` are
interpreted as GraphQL variables.

To pass nested parameters in the request payload, use `key[subkey]=value` syntax when
declaring fields. To pass nested values as arrays, declare multiple fields with the
syntax `key[]=value1`, `key[]=value2`. To pass an empty array, use `key[]` without a
value.

To pass pre-constructed JSON or payloads in other formats, a request body may be read
from file specified by `--input`. Use `-` to read from standard input. When passing the
request body this way, any parameters specified via field flags are added to the query
string of the endpoint URL.

In `--paginate` mode, all pages of results will sequentially be requested until
there are no more pages of results. For GraphQL requests, this requires that the
original query accepts an `$endCursor: String` variable and that it fetches the
`pageInfo{ hasNextPage, endCursor }` set of fields from a collection. Each page is a separate
JSON array or object. Pass `--slurp` to wrap all pages of JSON arrays or objects
into an outer JSON array.

For more information about output formatting flags, see `gh help formatting`.

USAGE
  gh api <endpoint> [flags]

FLAGS
      --cache duration        Cache the response, e.g. "3600s", "60m", "1h"
  -F, --field key=value       Add a typed parameter in key=value format
  -H, --header key:value      Add a HTTP request header in key:value format
      --hostname string       The GitHub hostname for the request (default "github.com")
  -i, --include               Include HTTP response status line and headers in the output
      --input file            The file to use as body for the HTTP request (use "-" to read from standard input)
  -q, --jq string             Query to select values from the response using jq syntax
  -X, --method string         The HTTP method for the request (default "GET")
      --paginate              Make additional HTTP requests to fetch all pages of results
  -p, --preview names         GitHub API preview names to request (without the "-preview" suffix)
  -f, --raw-field key=value   Add a string parameter in key=value format
      --silent                Do not print the response body
      --slurp                 Use with "--paginate" to return an array of all pages of either JSON arrays or objects
  -t, --template string       Format JSON output using a Go template; see "gh help formatting"
      --verbose               Include full HTTP request and response in the output

INHERITED FLAGS
  --help   Show help for command

EXAMPLES
  # list releases in the current repository
  $ gh api repos/{owner}/{repo}/releases
  
  # post an issue comment
  $ gh api repos/{owner}/{repo}/issues/123/comments -f body='Hi from CLI'
  
  # post nested parameter read from a file
  $ gh api gists -F 'files[myfile.txt][content]=@myfile.txt'
  
  # add parameters to a GET request
  $ gh api -X GET search/issues -f q='repo:cli/cli is:open remote'
  
  # set a custom HTTP header
  $ gh api -H 'Accept: application/vnd.github.v3.raw+json' ...
  
  # opt into GitHub API previews
  $ gh api --preview baptiste,nebula ...
  
  # print only specific fields from the response
  $ gh api repos/{owner}/{repo}/issues --jq '.[].title'
  
  # use a template for the output
  $ gh api repos/{owner}/{repo}/issues --template \
    '{{range .}}{{.title}} ({{.labels | pluck "name" | join ", " | color "yellow"}}){{"\n"}}{{end}}'
  
  # update allowed values of the "environment" custom property in a deeply nested array
  gh api -X PATCH /orgs/{org}/properties/schema \
     -F 'properties[][property_name]=environment' \
     -F 'properties[][default_value]=production' \
     -F 'properties[][allowed_values][]=staging' \
     -F 'properties[][allowed_values][]=production'
  
  # list releases with GraphQL
  $ gh api graphql -F owner='{owner}' -F name='{repo}' -f query='
    query($name: String!, $owner: String!) {
      repository(owner: $owner, name: $name) {
        releases(last: 3) {
          nodes { tagName }
        }
      }
    }
  '
  
  # list all repositories for a user
  $ gh api graphql --paginate -f query='
    query($endCursor: String) {
      viewer {
        repositories(first: 100, after: $endCursor) {
          nodes { nameWithOwner }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  '
  
  # get the percentage of forks for the current user
  $ gh api graphql --paginate --slurp -f query='
    query($endCursor: String) {
      viewer {
        repositories(first: 100, after: $endCursor) {
          nodes { isFork }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  ' | jq 'def count(e): reduce e as $_ (0;.+1);
  [.[].data.viewer.repositories.nodes[]] as $r | count(select($r[].isFork))/count($r[])'

ENVIRONMENT VARIABLES
  GH_TOKEN, GITHUB_TOKEN (in order of precedence): an authentication token for
  github.com API requests.
  
  GH_ENTERPRISE_TOKEN, GITHUB_ENTERPRISE_TOKEN (in order of precedence): an
  authentication token for API requests to GitHub Enterprise.
  
  GH_HOST: make the request to a GitHub host other than github.com.

LEARN MORE
  Use `gh <command> <subcommand> --help` for more information about a command.
  Read the manual at https://cli.github.com/manual
  Learn about exit codes using `gh help exit-codes`