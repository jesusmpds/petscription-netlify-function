const FoxySDK = require("@foxy.io/sdk");
const { FOXY_REFRESH_TOKEN, FOXY_CLIENT_SECRET, FOXY_CLIENT_ID } = process.env;
const foxy = new FoxySDK.Backend.API({
  refreshToken: FOXY_REFRESH_TOKEN,
  clientSecret: FOXY_CLIENT_SECRET,
  clientId: FOXY_CLIENT_ID,
});
const netlifyEndpoint =
  "https://ephemeral-tapioca-3c3a8a.netlify.app/.netlify/functions/custom-attributes";
const customerAttributesCollection = customerID =>
  `https://api.foxycart.com/customers/${customerID}/attributes`;
const customerAttributeResource = attributeID =>
  `https://api.foxycart.com/customer_attributes/${attributeID}`;
const allowedOrigins = [
  "https://petscriptions-6d43af.webflow.io",
  "https://petscriptions.ca",
  "https://www.petscriptions.ca",
];
const responseHeader = {
  optionsResponse: {
    "Access-Control-Allow-Headers": "authorization,Content-Type,foxy-api-version",
    "Access-Control-Allow-Methods": "GET, PATCH, OPTION",
    "Access-Control-Allow-Origin": "",
    Vary: "Origin",
  },
  okResponse: {
    "Access-Control-Allow-Origin": "",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  },
};

const commandTable = {
  GET: handleGet,
  OPTIONS: handleOptions,
  PATCH: handlePatch,
};

const errorResponse = details => {
  return {
    body: JSON.stringify({
      ok: false,
      details,
    }),
    statusCode: 500,
  };
};

function processRequest(event) {
  const { httpMethod } = event;
  return commandTable[httpMethod](event);
}

//Respond with http options
function handleOptions(event) {
  const { body, headers } = event;
  console.log("OPTIONS", event);
  console.log("headers.origin", headers.origin);
  if (allowedOrigins.includes(headers.origin)) {
    responseHeader.optionsResponse["Access-Control-Allow-Origin"] = headers.origin;
    return {
      headers: responseHeader.optionsResponse,
      statusCode: 204,
    };
  }
}

//Respond with hapi attributes
async function handleGet(event) {
  const { body, headers, queryStringParameters } = event;
  const customerID = queryStringParameters?.customer;

  console.log("GET Request", event);
  if (allowedOrigins.includes(headers.origin) && headers.authorization && customerID) {
    responseHeader.okResponse["Access-Control-Allow-Origin"] = headers.origin;
    try {
      const response = await foxy.fetch(customerAttributesCollection(customerID));
      if (response.ok) {
        const customerAttributes = await response.json();
        console.log("customerAttributes", customerAttributes);
        console.log(
          "Embedded Resources Original",
          JSON.stringify(customerAttributes._embedded, null, "\t")
        );

        const customerAttributesCustomSelf = customerAttributes._embedded["fx:attributes"].map(
          attribute => {
            const attributeUrl = attribute._links.self.href;
            const attributeID = attributeUrl.split("customer_attributes/")[1];
            const newURL = `${netlifyEndpoint}?attribute=${attributeID}`;

            // Assign new value
            attribute._links.self.href = newURL;
            return attribute;
          }
        );

        customerAttributes._embedded["fx:attributes"] = customerAttributesCustomSelf;
        console.log(
          "Embedded Resources New",
          JSON.stringify(customerAttributes._embedded, null, "\t")
        );
        return {
          headers: responseHeader.okResponse,
          statusCode: 200,
          body: JSON.stringify(customerAttributes),
        };
      }
      return Promise.reject(response);
    } catch (error) {
      console.log("ERROR: ", error);
      return errorResponse("An Error has ocurred when fetching the customer attributes");
    }
  }

  return {
    statusCode: 400,
    body: {
      ok: false,
      details: " Not an allowed origin or missing the customer ID",
    },
  };
}

async function handlePatch(event) {
  const { body, headers, queryStringParameters } = event;
  const attributeID = queryStringParameters?.attribute;
  if (allowedOrigins.includes(headers.origin) && headers.authorization && attributeID) {
    responseHeader.okResponse["Access-Control-Allow-Origin"] = headers.origin;
    try {
      console.log("PATCH", event);
      const response = await foxy.fetch(customerAttributeResource(attributeID), {
        method: "PATCH",
        body,
      });
      if (response.ok) {
        const newAttribute = await response.json();
        console.log("newAttribute", newAttribute);

        return {
          headers: responseHeader.okResponse,
          statusCode: 200,
          body: JSON.stringify(newAttribute),
        };
      }
      return Promise.reject(response);
    } catch (error) {
      console.log("ERROR: ", error);
      return errorResponse(
        `An Error has ocurred when patching the customer attribute ${attributeID}`
      );
    }
  }
  return {
    statusCode: 400,
    body: {
      ok: false,
      details: " Not an allowed origin or missing the attribute ID",
    },
  };
}

exports.handler = async (event, context) => {
  return processRequest(event);
};
