/* eslint-disable no-use-before-define */
import {
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email";

const fontFamily = "Inter, Arial, Helvetica, sans-serif";

export interface MagicLinkEmailProps {
  email: string;
  expiresInMinutes: number;
  url: string;
}

const colors = {
  border: "#e5e5e5",
  muted: "#737373",
  page: "#f5f5f5",
  primary: "#262626",
  teal: "#35a599",
  text: "#373737",
} as const;

export function MagicLinkEmail({
  email,
  expiresInMinutes,
  url,
}: MagicLinkEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu enlace para entrar a Patche</Preview>
      <Section style={styles.page}>
        <Container style={styles.card}>
          <Img
            alt="Patche"
            height="64"
            src="https://patche.mx/logo.png"
            style={styles.logo}
            width="192"
          />
          <Text style={styles.eyebrow}>ACCESO A PATCHE</Text>
          <Text style={styles.title}>Entra a tu cuenta</Text>
          <Text style={styles.copy}>
            Recibimos una solicitud para entrar con {email}. Usa el botón para
            continuar de forma segura.
          </Text>
          <Button href={url} style={styles.button}>
            Iniciar sesión
          </Button>
          <Text style={styles.expiry}>
            Este enlace caduca en {expiresInMinutes} minutos y solo puede usarse
            una vez.
          </Text>
          <Hr style={styles.rule} />
          <Text style={styles.fallback}>
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </Text>
          <Text style={styles.url}>{url}</Text>
          <Text style={styles.footer}>
            Si no solicitaste este acceso, puedes ignorar este correo.
          </Text>
        </Container>
        <Text style={styles.brand}>Patche · Papelería para tus ideas</Text>
      </Section>
    </Html>
  );
}

const styles = {
  brand: {
    color: colors.muted,
    fontFamily,
    fontSize: "12px",
    margin: "24px 0",
    textAlign: "center" as const,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: "10px",
    color: "#ffffff",
    display: "inline-block",
    fontFamily,
    fontSize: "14px",
    fontWeight: "700",
    padding: "14px 22px",
    textDecoration: "none",
  },
  card: {
    backgroundColor: "#ffffff",
    border: `1px solid ${colors.border}`,
    borderRadius: "20px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "40px",
  },
  copy: {
    color: colors.text,
    fontFamily,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 28px",
  },
  expiry: {
    color: colors.muted,
    fontFamily,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "18px 0 0",
  },
  eyebrow: {
    color: colors.teal,
    fontFamily,
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "2px",
    margin: "30px 0 10px",
  },
  fallback: {
    color: colors.muted,
    fontFamily,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 8px",
  },
  footer: {
    color: colors.muted,
    fontFamily,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "28px 0 0",
  },
  logo: {
    display: "block",
    objectFit: "contain" as const,
    objectPosition: "left",
  },
  page: {
    backgroundColor: colors.page,
    padding: "32px 16px",
  },
  rule: {
    borderColor: colors.border,
    margin: "28px 0",
  },
  title: {
    color: colors.text,
    fontFamily,
    fontSize: "30px",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    lineHeight: "36px",
    margin: "0 0 14px",
  },
  url: {
    color: colors.teal,
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "11px",
    lineHeight: "17px",
    overflowWrap: "anywhere" as const,
    wordBreak: "break-word" as const,
  },
} as const;
