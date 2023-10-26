const FoxySDK = require("@foxy.io/sdk");
const { FOXY_REFRESH_TOKEN, FOXY_CLIENT_SECRET, FOXY_CLIENT_ID, AIRTABLE_TOKEN } = process.env;
const foxy = new FoxySDK.Backend.API({
  refreshToken: FOXY_REFRESH_TOKEN,
  clientSecret: FOXY_CLIENT_SECRET,
  clientId: FOXY_CLIENT_ID,
});

const Airtable = require("airtable");
const base = new Airtable({ apiKey: AIRTABLE_TOKEN }).base("appR5bTWokItfoRxi");
const customerByEmail = customerEmail =>
  `https://api.foxycart.com/stores/107955/customers?email=${encodeURIComponent(customerEmail)}`;
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

const prescribingDoctorsInfoTemplate = [
  { name: "Prescribing_Doctor_1", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_2", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_3", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_4", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_5", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_6", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_7", value: "N/A", visibility: "public" },
  { name: "Prescribing_Doctor_8", value: "N/A", visibility: "public" },
  { name: "License_1", value: "N/A", visibility: "public" },
  { name: "License_2", value: "N/A", visibility: "public" },
  { name: "License_3", value: "N/A", visibility: "public" },
  { name: "License_4", value: "N/A", visibility: "public" },
  { name: "License_5", value: "N/A", visibility: "public" },
  { name: "License_6", value: "N/A", visibility: "public" },
  { name: "License_7", value: "N/A", visibility: "public" },
  { name: "License_8", value: "N/A", visibility: "public" },
  { name: "uploader-signature-1", value: "N/A", visibility: "public" },
  { name: "uploader-signature-2", value: "N/A", visibility: "public" },
  { name: "uploader-signature-3", value: "N/A", visibility: "public" },
  { name: "uploader-signature-4", value: "N/A", visibility: "public" },
  { name: "uploader-signature-5", value: "N/A", visibility: "public" },
  { name: "uploader-signature-6", value: "N/A", visibility: "public" },
  { name: "uploader-signature-7", value: "N/A", visibility: "public" },
  { name: "uploader-signature-8", value: "N/A", visibility: "public" },
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
    email: data.email,
  };

  const prescribingDoctorsPayload = prescribingDoctorsInfoTemplate.map(doctor => {
    return {
      name: doctor.name,
      value: data[doctor.name] ? data[doctor.name] : "N/A",
      visibility: "public",
    };
  });

  console.log("prescribingDoctorsPayload", prescribingDoctorsPayload);
  const defaultAddress = {
    address_name: "Me",
    company: data.company,
    address1: data.address1,
    address2: data?.address2 ?? "",
    city: data.city,
    region: data.region,
    postal_code: data.postal_code,
    country: data.country,
    phone: data.phone,
  };

  // Check if customer exists
  try {
    const customerExists = await foxyFetch(customerByEmail(customer.email), "GET");

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
    const newCustomer = await foxyFetch(
      createCustomer,
      "POST",
      customer,
      "An Error has ocurred when creating the foxy customer"
    );
    const customerID = newCustomer?.message.split(" ")[1];
    console.log("newCustomer", JSON.stringify(newCustomer));

    const customerAttributes = newCustomer._links["fx:attributes"].href;
    const customerDefaultShippingAddress = newCustomer._links["fx:default_shipping_address"].href;
    const customerDefaultBillingAddress = newCustomer._links["fx:default_billing_address"].href;

    const prescribingDoctorsPayloadNameAndLicense = [...prescribingDoctorsPayload].slice(0, 15);
    const prescribingDoctorsPayloadSignatures = [...prescribingDoctorsPayload].slice(16);

    const attributesNameAndLicense = await foxyFetch(
      customerAttributes,
      "PATCH",
      prescribingDoctorsPayloadNameAndLicense,
      "An Error has ocurred when creating the foxy attributesNameAndLicense"
    );

    const attributesSignature = await foxyFetch(
      customerAttributes,
      "PATCH",
      prescribingDoctorsPayloadSignatures,
      "An Error has ocurred when creating the foxy attributesSignature"
    );

    console.log(
      "newCustomer attributes",
      JSON.stringify(attributesNameAndLicense),
      JSON.stringify(attributesSignature)
    );

    const address = {
      shipping: await foxyFetch(
        customerDefaultShippingAddress,
        "PATCH",
        {
          ...defaultAddress,
          is_default_shipping: true,
        },
        "An Error has ocurred when creating the foxy customerDefaultShippingAddress"
      ),
      billing: await foxyFetch(
        customerDefaultBillingAddress,
        "PATCH",
        {
          ...defaultAddress,
          is_default_billing: true,
        },
        "An Error has ocurred when creating the foxy customerDefaultShippingAddress"
      ),
    };

    console.log("newCustomer address", JSON.stringify(address));

    if (customerID) {
      const record = await base("Customers").create({
        "Customer ID": `${customerID}`,
        "Clinic Name": `${defaultAddress.company}`,
        "Email Address": `${customer.email}`,
        "Phone Number": `${defaultAddress.phone}`,
      });

      console.log("record", record);
    }

    return {
      body: JSON.stringify({
        ok: true,
        data: {
          attributes: { attributesNameAndLicense, attributesSignature },
          address,
          customer: newCustomer,
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

async function foxyFetch(url, method, payload, errorMessage) {
  try {
    const res = await foxy.fetch(url, {
      method: method,
      body: payload ? JSON.stringify(payload) : null,
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.log("ERROR: ", error);
    return errorResponse(errorMessage);
  }
}
