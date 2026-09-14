# Utkarsh — Viral Buzz Media

Orange-and-black portfolio for **Utkarsh**, Business Consultant · Brand Strategist and Founder of **Viral Buzz Media** in Gorakhpur, Uttar Pradesh, India. Services include business consulting, brand strategy & management, social media management, digital marketing, campaign planning & execution, and end-to-end corporate & promotional event management.

## Local development and Vercel

Run `npm ci` to install dependencies, `npm run dev` for the local preview, `npm test` for the enquiry endpoint checks, and `npm run build` to generate `public/`. Vercel runs the build and deploys `api/book-call.js` as a Node.js function. The country selector and national number formatting use [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js); India (+91) is selected initially.

## Contact and social profiles

- **WhatsApp / Call:** +91 63943 92413
- **Email:** um426207@gmail.com
- **Instagram:** @viralbuzz_111 — https://www.instagram.com/viralbuzz_111/
- **Location:** Gorakhpur, Uttar Pradesh, India

Public settings are in `site-config.js`. WhatsApp and call links (`wa.me/916394392413` and `tel:+916394392413`) are wired through `app.js` and are used across the hero, contact section, service CTA, and booking card.

## Enquiry delivery — owner setup required

Header and mobile navigation "Let's work together" CTAs open an enquiry dialog that posts to `/api/book-call`. The primary CTAs throughout the page open WhatsApp or `mailto:` directly to give visitors an instant, reliable way to reach Utkarsh.

**Email delivery via the dialog is currently disabled** until the owner explicitly approves passing submitted name/email/phone/message through FormSubmit to `um426207@gmail.com`. Until enabled, the endpoint returns an honest setup error without sending data to a third party; the dialog includes direct WhatsApp and email alternatives.

To activate delivery:

1. Obtain the owner's approval to pass the submitted name, email, phone, and project details through FormSubmit to `um426207@gmail.com`.
2. Set `ENQUIRY_DELIVERY_ENABLED=true` in the Vercel project's server environment and redeploy.
3. Submit one clearly labelled test enquiry. FormSubmit requires the owner to click the activation link sent to their inbox before it sends enquiries.
4. Submit another test and confirm the email arrived with all four fields. An API acknowledgement alone is not proof of inbox delivery.

Provider reference: https://formsubmit.co/documentation
