import { URL, URLSearchParams } from 'url'
import { Agent, type Dispatcher } from 'undici'

type SendOtpMessageOptions = {
  phone: string
  otp: string
  validityMinutes: number
}

const DEFAULT_BASE_URL = process.env.MYSMSHOP_API_BASE_URL?.trim()?.length
  ? process.env.MYSMSHOP_API_BASE_URL.trim()
  : 'https://sms.mysmsshop.in/V2/http-api.php'

const insecureMySmsAgent = new Agent({ connect: { rejectUnauthorized: false } })
const API_KEY = process.env.MYSMSHOP_API_KEY?.trim() || ''
const SENDER_ID = process.env.MYSMSHOP_SENDER_ID?.trim() || ''
const TEMPLATE_ID = process.env.MYSMSHOP_TEMPLATE_ID?.trim() || ''
const HEADER_ID = process.env.MYSMSHOP_HEADER_ID?.trim() || ''
const ENTITY_ID = process.env.MYSMSHOP_ENTITY_ID?.trim() || ''
const DEFAULT_COUNTRY_PREFIX = process.env.MYSMSHOP_COUNTRY_PREFIX?.trim() || '91'
const DEFAULT_MESSAGE_TEMPLATE =
  process.env.MYSMSHOP_LOGIN_TEMPLATE?.trim() ||
  'Hi! Here is your login OTP for your Car Service Wale account: {OTP}. Please note that this OTP is valid for the next {MINUTES} minutes. Thank you!'

const encodePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  if (!digits) {
    throw new Error('Phone number is required for OTP delivery.')
  }
  if (digits.startsWith(DEFAULT_COUNTRY_PREFIX)) {
    return digits
  }
  return `${DEFAULT_COUNTRY_PREFIX}${digits}`
}

const buildMessage = (otp: string, validityMinutes: number) =>
  DEFAULT_MESSAGE_TEMPLATE.replace('{OTP}', otp).replace('{MINUTES}', `${validityMinutes}`)

export const sendOtpMessage = async ({ phone, otp, validityMinutes }: SendOtpMessageOptions) => {
  if (!API_KEY || !SENDER_ID) {
    console.warn(
      '[sms] MySMSshop credentials not configured. OTP will be logged instead of sent.',
      { phone },
    )
    console.info(`[sms] OTP for ${phone}: ${otp}`)
    return
  }

  const missingConfig: string[] = []
  if (!TEMPLATE_ID) missingConfig.push('MYSMSHOP_TEMPLATE_ID')
  if (!HEADER_ID) missingConfig.push('MYSMSHOP_HEADER_ID')
  if (!ENTITY_ID) missingConfig.push('MYSMSHOP_ENTITY_ID')

  if (missingConfig.length > 0) {
    console.warn(
      '[sms] MySMSshop configuration missing optional parameters. Provider may reject OTP delivery.',
      { missing: missingConfig },
    )
  }

  const encodedPhone = encodePhone(phone)
  const message = buildMessage(otp, validityMinutes)

  const params = new URLSearchParams()
  params.set('apikey', API_KEY)
  params.set('senderid', SENDER_ID)
  params.set('message', message)
  params.set('number', encodedPhone)
  params.set('format', 'json')
  if (TEMPLATE_ID) {
    params.set('template_id', TEMPLATE_ID)
    params.set('templateid', TEMPLATE_ID)
  }
  if (HEADER_ID) {
    params.set('header_id', HEADER_ID)
    params.set('headerid', HEADER_ID)
  }
  if (ENTITY_ID) {
    params.set('entity_id', ENTITY_ID)
    params.set('entityid', ENTITY_ID)
  }

  const url = `${DEFAULT_BASE_URL}?${params.toString()}`

  const urlDescriptor = new URL(url)
  const fetchOptions: RequestInit & { dispatcher?: Dispatcher } = { method: 'GET' }

  if (urlDescriptor.protocol === 'https:' && urlDescriptor.hostname.endsWith('mysmsshop.in')) {
    fetchOptions.dispatcher = insecureMySmsAgent
  }

  const response = await fetch(urlDescriptor, fetchOptions)
  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`MySMSshop request failed: ${response.status} ${response.statusText} -> ${responseText}`)
  }

  try {
    const parsed = JSON.parse(responseText)
    const status = parsed.status ?? parsed.Status ?? parsed.statuscode ?? parsed.statusCode
    if (
      status &&
      String(status).toLowerCase() !== 'success' &&
      String(status).toLowerCase() !== 'ok' &&
      Number(status) !== 200
    ) {
      throw new Error(`MySMSshop responded with status ${status}: ${responseText}`)
    }
    console.info('[sms] MySMSshop accepted OTP request.', {
      phone: encodedPhone,
      status: status ?? response.status,
      messageId: parsed.data?.[0]?.id ?? parsed.id ?? null,
      providerMessage: parsed.message ?? null,
    })
  } catch (error) {
    // If parsing fails, log and proceed—provider may return plain text.
    if (error instanceof Error) {
      console.warn('Unable to parse MySMSshop response as JSON.', error.message)
    }
  }
}
