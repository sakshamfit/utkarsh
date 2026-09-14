# Utkarsh portfolio

Orange-and-black portfolio for Utkarsh, UX/UI Product Designer in France. The existing portrait, entrance animation, contact section, and capabilities are preserved. The hero is smaller and quieter, followed by a short About Me section.

## Local development and Vercel

Run `npm ci` to install dependencies, `npm run dev` for the local preview, `npm test` for the enquiry endpoint checks, and `npm run build` to generate `public/`. Vercel runs the build and deploys `api/book-call.js` as a Node.js function. Only the frontend assets are copied to `public/`. The country selector and national number formatting use [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js); the browser bundle is served locally without external requests. France (+33) is selected initially.

## Contact and social profiles

Contact email: `gireeshuiux@gmail.com`. Public settings are in `site-config.js`. Add the owner's exact `linkedinUrl` and `instagramUrl` to enable the subtle hero links. They are visibly disabled until configured; no guessed profile destinations are used.

## Enquiry delivery — owner setup required

Only the header and mobile navigation Book a Call CTAs open the enquiry dialog. The orange Book an appointment CTAs and the closing project link open a `mailto:` draft to `gireeshuiux@gmail.com` with the subject “Project appointment request” and a prefilled request for Google Meet availability. Visitors send that draft through their own configured email application; clicking the link does not send an email automatically or reserve a meeting. It asks for name, email, phone, and optional project details. The client and server validate email, phone, and field lengths. Invalid and failed submissions keep the entered details. A success message appears only after the server receives a positive provider acknowledgement.

**Email delivery is currently disabled.** Automatic approval review blocked the live test because using FormSubmit as an intermediary had not been explicitly approved. Do not claim inbox delivery has been verified.

To activate delivery:

1. Obtain the owner's approval to pass the submitted name, email, phone, and project details through FormSubmit to `gireeshuiux@gmail.com`.
2. Set `ENQUIRY_DELIVERY_ENABLED=true` in the Vercel project's server environment and redeploy.
3. Submit one clearly labelled test enquiry. FormSubmit requires the owner to click the activation link sent to their inbox before it sends enquiries.
4. Submit another test and confirm the email arrived with all four fields. An API acknowledgement alone is not proof of inbox delivery.

Until enabled, the endpoint returns an honest setup error without sending data to a third party. Activation-required provider responses are also errors, never success. The dialog includes a direct email alternative.

The recipient is fixed on the server. No credentials or visitor details are stored in the repository. The endpoint includes a honeypot, same-origin checks, request size limits, and a best-effort in-memory throttle and retry cache. These reset across serverless instances; stronger distributed spam protection can be added if traffic requires it. FormSubmit may retain submissions for 30 days under its service policy.

This is a call enquiry, not an automatic calendar reservation. Utkarsh confirms the time and shares the Google Meet link by email.

Provider reference: https://formsubmit.co/documentation
