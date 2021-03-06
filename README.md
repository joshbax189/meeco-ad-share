# Usage

This simulates an ad driven share between a user and an advertiser. The shared data is determined by the inputs of the `test-form` form in `dist/index.html`. The advertiser agent generates a new invite for each new visitor.

## Manual Install

1. Set the server and sandbox key (if using) in `environment.yaml`.
  (Use the same file for the `meeco` CLI commands below).
2. Generate a service user (i.e advertiser agent) via CLI: `meeco users:create -p PASSWORD > service_user_auth.yaml`.
3. Get the service user id from `meeco users:get -p PASSWORD -a service_user_auth.yaml > service_user_info.yaml` using the password from above.
4. Generate a user via CLI: `meeco users:create -p PASSWORD2 > file`. You will use the secret and password to login on the site.
5. `npm install` in the main directory.
6. Run `npm run build` (just the first time, otherwise just use `npm start`).

## Install with Script

1. Set the server and sandbox key (if using) in `environment.yaml`.
2. If Meeco CLI is not globally installed, set the CLI repo path in `init.sh`
3. Customize passwords in `init.sh` if desired.
4. Run `init.sh`, this creates all necessary users.
5. `npm install` in the main directory.
6. Run `npm run build` (just the first time, otherwise just use `npm start`).

## Running
This applies to both steps

7. Run dev server with `npm start`, visit http://localhost:1234
8. Login with user credentials set in `init.sh`, you should see the vault token appear.
9. Clicking the big red "ad" will show the form. Fill it in and you should see a new share created for the user.
10. Logging in a second time should re-use the created template and connection.

# How it Works

The form input labels are scraped and used to create a template for the shared item.
The service agent can send a JSON representation of the form to "share" a template.
By choosing from the list of existing Meeco templates, an advertiser could request user info.

The form will include metadata about the site, which the user can choose to hide, for example, location, time, content tags.

The form will also include a function to 'broadcast' the same metadata record, perhaps soliciting other requests from advertisers who are watching the same tags.

# TODO

- Implement "tell me more"
- User can add terms/expiry to share
- Broadcast function to several advertisers
