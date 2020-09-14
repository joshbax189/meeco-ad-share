# Usage

This simulates an ad driven share between a user and an advertiser. The shared data is determined by the inputs of the `test-form` form in `dist/index.html`. The advertiser agent generates a new invite for each new visitor.


1. Generate a service user (i.e advertiser agent) via CLI: `meeco users:create -p PASSWORD > file` and copy the credentials to `src/serviceUser.js`.
2. Get the service user id from `https://sandbox.meeco.me/vault/me` using the generated vault token above.
2. Generate a user via CLI: `meeco users:create -p PASSWORD > file`. You will use the secret and password to login on the site.
3. `npm install` in the main directory.
4. Run dev server with `npm start`, visit http://localhost:1234
5. Login with user credentials.
5. Clicking the big red "ad" will show the form. Fill it in and you should see a new share created for the user.
6. Logging in a second time should re-use the created template and connection.

# How it Works

The form input labels are scraped and used to create a template for the shared item.
The service agent can send a JSON representation of the form to "share" a template.
By choosing from the list of existing Meeco templates, an advertiser could request user info.

The form will include metadata about the site, which the user can choose to hide, for example, location, time, content tags.

The form will also include a function to 'broadcast' the same metadata record, perhaps soliciting other requests from advertisers who are watching the same tags.

# TODO

- Implement "tell me more"
- Use shares v2
- Advertiser can ask for existing templates
- User can add terms/expiry to share
- User can redact some data in their response
- Broadcast function to several advertisers
