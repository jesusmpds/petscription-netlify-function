const FoxySDK = require("@foxy.io/sdk");
const { FOXY_REFRESH_TOKEN, FOXY_CLIENT_SECRET, FOXY_CLIENT_ID } = process.env;
const foxy = new FoxySDK.Backend.API({
  refreshToken: FOXY_REFRESH_TOKEN,
  clientSecret: FOXY_CLIENT_SECRET,
  clientId: FOXY_CLIENT_ID,
});
const allowedOrigins = [
  "https://petscriptions-6d43af.webflow.io",
  "https://petscriptions.ca",
  "https://www.petscriptions.ca",
];
const optionHeaders = {
  "Access-Control-Allow-Headers": "authorization,Content-Type,foxy-api-version",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTION",
  "Access-Control-Allow-Origin": "",
};

const commandTable = {
  GET: handleGet,
  OPTIONS: handleOptions,
  PATCH: handlePatch,
};

function processRequest(event) {
  const { httpMethod } = event;
  return commandTable[httpMethod](event);
}
//Respond with http options
function handleOptions(event) {
  const { body, headers, httpMethod } = event;
  console.log("OPTIONS", event);
  console.log("headers.origin", headers.origin);
  if (allowedOrigins.includes(headers.origin)) {
    optionHeaders["Access-Control-Allow-Origin"] = headers.origin;
    return {
      headers: optionHeaders,
      statusCode: 204,
    };
  }
}

function handleGet() {}

function handlePatch() {
  try {
  } catch (error) {
    console.log("ERROR: ", error);
    return {
      body: JSON.stringify({
        ok: false,
        details: "An error has occurred when creating the foxy customer",
      }),

      statusCode: 500,
    };
  }
}

exports.handler = async (event, context) => {
  return processRequest(event);
};
