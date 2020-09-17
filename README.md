# Usage

This simulates an ad driven share between a user and an advertiser. The shared data is determined by the inputs of the `test-form` form in `dist/index.html`. The advertiser agent generates a new invite for each new visitor.

1. Set the server and sandbox key (if using) in `environment.yaml`.
  (Use the same file for the `meeco` CLI commands below).
2. Generate a service user (i.e advertiser agent) via CLI: `meeco users:create -p PASSWORD > file` and copy the credentials to `src/serviceUser.js`.
3. Get the service user id from `meeco users:get -s SECRET -p PASSWORD` using the generated secret and password from above. Add the id to `src/serviceUser.js`.
4. Generate a user via CLI: `meeco users:create -p PASSWORD2 > file`. You will use the secret and password to login on the site.
5. `npm install` in the main directory.
6. Run dev server with `npm start`, visit http://localhost:1234
7. Login with user credentials.
8. Clicking the big red "ad" will show the form. Fill it in and you should see a new share created for the user.
9. Logging in a second time should re-use the created template and connection.

# How it Works

The form input labels are scraped and used to create a template for the shared item.
The service agent can send a JSON representation of the form to "share" a template.
By choosing from the list of existing Meeco templates, an advertiser could request user info.

The form will include metadata about the site, which the user can choose to hide, for example, location, time, content tags.

The form will also include a function to 'broadcast' the same metadata record, perhaps soliciting other requests from advertisers who are watching the same tags.

# TODO

- Startup scripts
- Implement "tell me more"
- Use shares v2
- User can add terms/expiry to share
- User can redact some data in their response
- Broadcast function to several advertisers
