const http   = require('http')
const crypto = require('crypto')
const { execFile } = require('child_process')
const path   = require('path')

const PORT          = 9000
const SECRET        = process.env.WEBHOOK_SECRET
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh')

if (!SECRET) {
  console.error('WEBHOOK_SECRET non défini. Arrêt.')
  process.exit(1)
}

function verifySignature(payload, signature) {
  if (!signature) return false
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(payload)
  const expected = 'sha256=' + hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256']

    if (!verifySignature(body, signature)) {
      console.error(`[${new Date().toISOString()}] Signature invalide`)
      res.writeHead(401)
      res.end('Signature invalide')
      return
    }

    let payload
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400)
      res.end('JSON invalide')
      return
    }

    // Ignorer tout ce qui n'est pas un push sur main
    if (payload.ref !== 'refs/heads/main') {
      console.log(`[${new Date().toISOString()}] Push ignoré (${payload.ref})`)
      res.writeHead(200)
      res.end('Branche ignorée')
      return
    }

    console.log(`[${new Date().toISOString()}] Push sur main — lancement déploiement`)

    // Répondre à GitHub immédiatement (délai max 10s côté GitHub)
    res.writeHead(200)
    res.end('Déploiement lancé')

    // Fire & forget — le déploiement tourne en arrière-plan
    execFile('/bin/bash', [DEPLOY_SCRIPT], (error, stdout, stderr) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Erreur déploiement:`, error.message)
        if (stderr) console.error(stderr)
        return
      }
      console.log(`[${new Date().toISOString()}] Déploiement réussi`)
      if (stdout) console.log(stdout)
    })
  })
})

server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Webhook server démarré sur port ${PORT}`)
})
