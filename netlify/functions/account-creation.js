const FoxySDK = require("@foxy.io/sdk");
const { FOXY_REFRESH_TOKEN, FOXY_CLIENT_SECRET, FOXY_CLIENT_ID } = process.env;
const foxy = new FoxySDK.Backend.API({
  refreshToken: FOXY_REFRESH_TOKEN,
  clientSecret: FOXY_CLIENT_SECRET,
  clientId: FOXY_CLIENT_ID,
});

const customerByEmail = customerEmail =>
  `https://api.foxycart.com/stores/107955/customers?email=${customerEmail}`;
const createCustomer = "https://api.foxycart.com/stores/107955/customers";
const allowedOrigins = [
  "https://petscriptions-6d43af.webflow.io",
  "https://petscriptions.ca",
  "https://www.petscriptions.ca",
];

const errorResponse = details => {
  return {
    body: JSON.stringify({
      ok: false,
      details,
    }),
    statusCode: 500,
  };
};

const prescribingDoctors = [
  { name: "Prescribing_Doctor_1", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_2", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_3", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_4", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_5", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_6", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_7", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_8", value: "N/A", visibility: "public" },
];

// Netlify Function
exports.handler = async event => {
  const { body, headers } = event;
  const data = JSON.parse(body);

  if (!allowedOrigins.includes(headers.origin)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        details: " Not an allowed origin ",
      },
      headers: { "Access-Control-Allow-Origin": "" },
    };
  }

  const customer = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
  };

  const formCustomerAttributes = prescribingDoctors.map(doctor => {
    return {
      name: doctor.name,
      value: data[doctor.name] ? data[doctor.name] : "N/A",
      visibility: "public",
    };
  });

  console.log("formCustomerAttributes", formCustomerAttributes);
  const defaultAddress = {
    address_name: "Me",
    first_name: data.first_name,
    last_name: data.last_name,
    company: data.company,
    address1: data.address1,
    address2: data?.address2 ?? "",
    city: data.city,
    region: data.region,
    postal_code: data.postal_code,
    country: data.country,
    phone: data.phone,
    is_default_billing: true,
    is_default_shipping: true,
  };

  // Check if customer exists
  try {
    const customerExists = await (await foxy.fetch(customerByEmail(customer.email))).json();

    if (customerExists.returned_items) {
      return {
        body: JSON.stringify({
          ok: true,
          details: "Customer already exists",
        }),
        statusCode: 409,
        headers: { "Access-Control-Allow-Origin": headers.origin },
      };
    }
  } catch (error) {
    console.log("ERROR: ", error);
    return errorResponse("An Error has ocurred when fetching the customer by email");
  }

  try {
    const res = await foxy.fetch(createCustomer, {
      method: "POST",
      body: JSON.stringify(customer),
    });
    const newCustomer = await res.json();
    console.log("newCustomer", JSON.stringify(newCustomer));

    const customerAttributes = newCustomer._links["fx:attributes"].href;
    const customerDefaultShippingAddress = newCustomer._links["fx:default_shipping_address"].href;

    const attributes = await (
      await foxy.fetch(customerAttributes, {
        method: "PATCH",
        body: JSON.stringify(formCustomerAttributes),
      })
    ).json();

    console.log("newCustomer attributes", JSON.stringify(attributes._embedded));

    const address = await (
      await foxy.fetch(customerDefaultShippingAddress, {
        method: "PATCH",
        body: JSON.stringify(defaultAddress),
      })
    ).json();

    console.log("newCustomer address", JSON.stringify(address._embedded));

    return {
      body: JSON.stringify({
        ok: true,
        data: {
          customer: newCustomer,
          attributes,
          address,
        },
      }),
      headers: { "Access-Control-Allow-Origin": headers.origin },
      statusCode: 200,
    };
  } catch (error) {
    console.log("ERROR: ", error);
    return errorResponse("An Error has ocurred when creating the foxy customer");
  }
};
