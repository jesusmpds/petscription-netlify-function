const FoxySDK = require("@foxy.io/sdk");
const { FOXY_REFRESH_TOKEN, FOXY_CLIENT_SECRET, FOXY_CLIENT_ID } = process.env;
const foxy = new FoxySDK.Backend.API({
  refreshToken: FOXY_REFRESH_TOKEN,
  clientSecret: FOXY_CLIENT_SECRET,
  clientId: FOXY_CLIENT_ID,
});
const customerAttributesCollection = customerID =>
  `https://api.foxycart.com/customers/${customerID}/attributes`;
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
  },
  getResponse: {
    "Access-Control-Allow-Origin": "",
    "Content-Type": "application/json; charset=utf-8",
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
  if (allowedOrigins.includes(headers.origin) && customerID) {
    responseHeader.getResponse["Access-Control-Allow-Origin"] = headers.origin;
    try {
      const response = await foxy.fetch(customerAttributesCollection(customerID));
      if (response.ok) {
        const customerAttributes = await response.json();
        console.log("customerAttributes", customerAttributes);
        console.log("Embedded Resources", JSON.stringify(customerAttributes._embedded));

        return {
          headers: responseHeader.getResponse,
          statusCode: 200,
          body: JSON.stringify(customerAttributes),
        };
      }
    } catch (error) {
      console.log(error);
      errorResponse("An Error has ocurred when fetching the customer attributes");
    }
    // return {
    //   headers: responseHeader.getResponse,
    //   statusCode: 200,
    //   body: JSON.stringify({
    //     _links: {
    //       self: {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/",
    //         title: "This Customer",
    //       },
    //       "fx:attributes": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/attributes",
    //         title: "Attributes for this Customer",
    //       },
    //       "fx:default_billing_address": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/default_billing_address",
    //         title: "Default Billing Address for this Customer",
    //       },
    //       "fx:default_shipping_address": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/default_shipping_address",
    //         title: "Default Shipping Address for this Customer",
    //       },
    //       "fx:default_payment_method": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/default_payment_method",
    //         title: "Default Payment Method for this Customer",
    //       },
    //       "fx:transactions": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/transactions?customer_id=36335808",
    //         title: "Transactions for this Customer",
    //       },
    //       "fx:subscriptions": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/subscriptions?customer_id=36335808",
    //         title: "Subscriptions for this Customer",
    //       },
    //       "fx:customer_addresses": {
    //         href: "https://petscriptions-live.foxycart.com/s/customer/addresses",
    //         title: "Addresses for this Customer",
    //       },
    //       "fx:checkout": {
    //         title: "Checkout URL",
    //         href: "https://petscriptions-live.foxycart.com/checkout?fc_customer_id=36335808&fc_auth_token=eba6e1cb2904b1e06f7c0a82e06cb7f1ee8c8766&timestamp=1694558153",
    //       },
    //     },
    //     _embedded: {
    //       "fx:attributes": [
    //         {
    //           _links: {
    //             self: {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/attributes/10841509",
    //               title: "This customer attribute",
    //             },
    //             "fx:customer": {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/",
    //               title: "This Customer",
    //             },
    //           },
    //           name: "Prescribing Doctor 1",
    //           value: "Doctor Test 1 Foxy",
    //           date_created: "2023-08-30T13:35:21-07:00",
    //           date_modified: "2023-09-01T08:04:32-07:00",
    //         },
    //         {
    //           _links: {
    //             self: {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/attributes/10841510",
    //               title: "This customer attribute",
    //             },
    //             "fx:customer": {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/",
    //               title: "This Customer",
    //             },
    //           },
    //           name: "Prescribing Doctor 2",
    //           value: "Doctor Test 2",
    //           date_created: "2023-08-30T13:35:21-07:00",
    //           date_modified: "2023-08-30T13:35:21-07:00",
    //         },
    //         {
    //           _links: {
    //             self: {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/attributes/10841511",
    //               title: "This customer attribute",
    //             },
    //             "fx:customer": {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/",
    //               title: "This Customer",
    //             },
    //           },
    //           name: "Prescribing Doctor 3",
    //           value: "Doctor Test 3",
    //           date_created: "2023-08-30T13:35:21-07:00",
    //           date_modified: "2023-08-30T13:35:21-07:00",
    //         },
    //         {
    //           _links: {
    //             self: {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/attributes/10841512",
    //               title: "This customer attribute",
    //             },
    //             "fx:customer": {
    //               href: "https://petscriptions-live.foxycart.com/s/customer/",
    //               title: "This Customer",
    //             },
    //           },
    //           name: "Prescribing Doctor 4",
    //           value: "Doctor Test 4",
    //           date_created: "2023-08-30T13:35:21-07:00",
    //           date_modified: "2023-08-30T13:35:21-07:00",
    //         },
    //       ],
    //     },
    //     id: 36335808,
    //     last_login_date: "2023-08-30T13:35:13-07:00",
    //     first_name: "Jesusaa",
    //     last_name: "Perezz",
    //     email: "jesus.perez@foxycart.com",
    //     tax_id: "",
    //     date_created: "2023-08-30T11:33:01-07:00",
    //     date_modified: "2023-09-08T11:24:58-07:00",
    //   }),
    // };
  }
}

function handlePatch(event) {
  try {
  } catch (error) {
    console.log("ERROR: ", error);
    return;
  }
}

exports.handler = async (event, context) => {
  return processRequest(event);
};
