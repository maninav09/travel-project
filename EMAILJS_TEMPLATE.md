# EmailJS Newsletter Template (Travel-route Connection)

Use this in your EmailJS template editor for `EMAILJS_TEMPLATE_ID`.

## Subject
```text
{{subject}}
```

## To email
```text
{{to_email}}
```

## HTML content
```html
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#0b3a53;padding:24px 28px;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;line-height:1.3;">Welcome to {{app_name}}</h1>
                <p style="margin:8px 0 0;font-size:14px;line-height:1.5;opacity:0.9;">Trip planning updates, offers, and travel ideas</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#1f2937;">
                  Hi {{recipient_name}},
                </p>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
                  {{message}}
                </p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;line-height:1.6;color:#475569;">
                      <strong>Subscriber Email:</strong> {{subscriber_email}}<br />
                      <strong>Source:</strong> {{source}}
                    </td>
                  </tr>
                </table>

                <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                  Thanks for subscribing. We will share practical route tips, discounts, and new features.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;background:#f1f5f9;font-size:12px;line-height:1.6;color:#64748b;">
                You received this email because you subscribed on Travel-route Connection.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Variables expected by your backend
- `{{subscriber_email}}`
- `{{to_email}}`
- `{{recipient_name}}`
- `{{source}}`
- `{{app_name}}`
- `{{subject}}`
- `{{message}}`
