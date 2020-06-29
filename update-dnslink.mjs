import request from 'request-promise-native'

const DOMAIN = 'hypertext.finance'

async function main() {
  // get the existing dnslink record from vercel
  const record = await request
    .get(`https://api.vercel.com/v4/domains/${DOMAIN}/records`, {
      auth: {
        bearer: process.env.VERCEL_TOKEN,
      },
      json: true,
    })
    .then(({ records }) => {
      const record = records.filter((record) => record.name === '_dnslink')[0]
      console.log('Successfully retrieved existing DNS record', record)
      return record
    })

  // delete the existing dnslink record from vercel
  await request
    .delete(`https://api.vercel.com/v2/domains/${DOMAIN}/records/${record.id}`, {
      auth: {
        bearer: process.env.VERCEL_TOKEN,
      },
      json: true,
    })
    .then(() => {
      console.log('Successfully deleted existing DNS record')
    })

  // add the new dnslink record to zeit
  await request
    .post(`https://api.vercel.com/v2/domains/${DOMAIN}/records`, {
      auth: {
        bearer: process.env.VERCEL_TOKEN,
      },
      json: true,
      body: {
        name: '_dnslink',
        type: 'TXT',
        value: `dnslink=/ipfs/${process.env.IPFS_HASH}`,
      },
    })
    .then(() => {
      console.log('Successfully added new DNS record')
    })
}

main()
