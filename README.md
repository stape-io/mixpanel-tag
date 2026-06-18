# Mixpanel Tag for Google Tag Manager Server Container

**Mixpanel tag can track these action types:**

- Track - tracks Mixpanel events.
- Identify - merges anonymous ID with first-party User ID.
- Alias - adds an alias to existing Mixpanel contact.
- Set - sets user profile properties.
- Set Once - sets user profile properties **only** if they are not already set.
- Append - appends user profile properties to a list.
- Reset - resets identification of Mixpanel contact.


> ✅ This tag supports **both** the **Original ID Merge** and the **Simplified ID Merge** methods of `ID Management`.
>
> Use the **ID Merge API** setting to match your project (check it under [Project Settings → Identity Merge](https://mixpanel.com/settings/project/id-management)). It defaults to **Original** for backwards compatibility.
>
> - **Original ID Merge** sends the reserved `$identify` / `$create_alias` events using `$anon_id` and `$identified_id`.
> - **Simplified ID Merge** sends `$device_id` (anonymous) and, once known, `$user_id`, and lets Mixpanel derive the `distinct_id`. Set the **User ID ($user_id)** field on `track` / profile tags for logged-in users, and the `$device_id` ⇄ `$user_id` mapping is created automatically. The `alias` type is not used with Simplified ID Merge.
>
> Learn more: [ID Management](https://docs.mixpanel.com/docs/tracking-methods/id-management), [Original ID Merge](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-original), [Simplified ID Merge](https://docs.mixpanel.com/docs/tracking-methods/id-management/identifying-users-simplified) and [Migrating to Simplified ID Merge](https://docs.mixpanel.com/docs/tracking-methods/id-management/migrating-to-simplified-id-merge-system)


**Mixpanel tag capabilities:**

- `Automatically handle customer distinct_id` - Mixpanel server API optimized for stateless shared usage; e.g., in a web application, the same mixpanel instance is used across requests for all users. Rather than setting a `distinct_id` through `identity()` calls like Mixpanel client-side libraries (where a single Mixpanel instance is tied to a single user), this API requires you to pass the `distinct_id` with every tracking call.
- `Send common data with request` - sends user_agent, path, $current_url, $screen_width, $screen_height, $referrer, user ip, etc.
- `Get parameters from the variable` - extracts parameters from the sGTM variable.
- `Additional Parameters` - add parameters you need to send to Mixpanel.
- `Remove parameters from the request` - specify parameters you want to remove from the requests.


## How to use

- [Mixpanel tag for server Google Tag manager](https://stape.io/blog/mixpanel-tag-for-server-google-tag-manager)

## Open Source

The **Mixpanel Tag for GTM Server Side** is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.

Also, big thanks to our contributors:

- [Mariusz Brucki](https://github.com/mbrucki)

### GTM Gallery Status
🟢 [Listed](https://tagmanager.google.com/gallery/#/owners/stape-io/templates/mixpanel-tag)
