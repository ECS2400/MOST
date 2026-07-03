import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const darkBg = '#0F0A1E';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; background-color: ${darkBg}; }
              input, textarea {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
                -webkit-appearance: none;
                appearance: none;
                box-sizing: border-box;
                min-width: 0;
              }
              input:-webkit-autofill,
              input:-webkit-autofill:hover,
              input:-webkit-autofill:focus {
                -webkit-box-shadow: 0 0 0 1000px #241545 inset !important;
                -webkit-text-fill-color: #F5F3FF !important;
                caret-color: #F5F3FF !important;
                transition: background-color 99999s ease-out 0s;
              }
            `,
          }}
        />
      </head>
      <body style={{ backgroundColor: darkBg }}>{children}</body>
    </html>
  );
}
