## FLOW

User Story For Consultation

1- Register or Login User (Authenticate wit mobile OTP)
2- Get more information from User and update USER object

 >> USER Registered and could click on [ Take Consult ]

 >> When User click, we will create new `Consult` DOC and then navigate to questions section with data

3- user will navigate to questions sections and fill all information and apply `Consult` DOC  ( update consultant )
4- After updating consult, in the controller we will check if user must take register for consultation or not

    - In The Case [Yes] :
        user will be navigate to select `type of consult` and assign the `slot-time` for him/her
        `slot-time` and `type of consult` save to consult Doc
        ...THEN

        user will navigate to payment section
            * create new Transaction Doc and sned user to the Bank checkout with Transaction reference
            * get response from Bank ( Faild || Pass  )
        If transaction will be success we
            * change Transation Status from `false` to `true`
            * chnage payment and status in Consult Object

            ```
            {
              payment: [TRANSACTIONS],

              // If we have pass_payment means payment transaction pass **successfully**
              pass_payment: TRANSACTION
            }

            ```
        ...THEN


        we will send SMS to user that contain [ consult_reference_number  ]
        create reminder (cron job) whenever close to consult session
