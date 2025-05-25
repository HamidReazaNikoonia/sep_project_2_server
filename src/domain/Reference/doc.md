## Model

* customer name and family :: (username)
* customer mobile number :: (mobile)
* customer age :: (age)
* customer gender :: (gender)
* customer country/city :: (place)
* reference variety :: (reference_variaty) ::  enum['hozori', 'online', 'by_telephone']
* reference payment {status, ref_number}
* reference status :: enum["CREATED", "WAITING", "RESOLVE"]


## Endpoints


> __GET__  Get all Reference `/reference` (ADMIN)
> __GET__ Get Specific Reference `/reference/:reference_id` (ADMIN || CUSTOMER)

> __POST__ create the Reference By Customer `/:customer_id/reference` (CUSTOMER)

UPDATE
1- Update Status
2- Update reservation Time 


> __PUT__ update the Reference BY Admin `/:customer_id/reference/reference_id` (ADMIN)
> __DELETE__ delete the Reference BY Admin `/:customer_id/reference/reference_id` (ADMIN)

