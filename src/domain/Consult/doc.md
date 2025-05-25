## Model

**Consult**

user_id
Consultant_dr_id
result_for_consult: boolean
report: [
  question: String,
  checkbox: [{ title: String, value: boolean }],
]


## Logic

> If


## Endpoints


> __GET__  Get all Reference `/reference` (ADMIN)
> __GET__ Get Specific Reference `/reference/:reference_id` (ADMIN || CUSTOMER)

> __POST__ create the Reference By Customer `/:customer_id/reference` (CUSTOMER)

UPDATE
1- Update Status
2- Update reservation Time


> __PUT__ update the Reference BY Admin `/:customer_id/reference/reference_id` (ADMIN)
> __DELETE__ delete the Reference BY Admin `/:customer_id/reference/reference_id` (ADMIN)

