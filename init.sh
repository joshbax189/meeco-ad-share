#!/bin/bash

set -e

# Assumes Meeco CLI is installed

# Otherwise uncomment the below and use the appropriate path
shopt -s expand_aliases
PATH_TO_MEECO_CLI_REPO='~/git/meeco/js-sdk'
alias meeco="node $PATH_TO_MEECO_CLI_REPO/packages/cli/bin/run"

PASSWORD=password
PASSWORD2=pass2

# Generate a default user
meeco users:create -e environment.yaml -p $PASSWORD > user_auth.yaml

# Generate a service user
meeco users:create -e environment.yaml -p $PASSWORD2 > service_user_auth.yaml

# Get SU id
meeco users:get -e environment.yaml -a service_user_auth.yaml > service_user_info.yaml
