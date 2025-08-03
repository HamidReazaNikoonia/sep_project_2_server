## Get All Program Order For Admin


on the `getAllOrdersOfProgramForAdmin` service we have these argument as filter

1- coach_id ( find all  Order where `order.classProgramId.coach?._id === coach_id`)
2- `course_id` ( find all Order where `order.courseSessionId == course_id` )
3- `program_id` ( find all Order where `order.courseSessionId == program_id` )
4- `class_id` ( find all Order where `order.classProgramId.class_id === class_id` )
5- `user_id` (find all Order where `order.userId == user_id`)
6- `order_status` ( find all Order where `order.orderStatus === order_status` )
7- `payment_status` ( find all Order where order?.paymentStatus === payment_status )
8- `transaction_id` (find all Order where `order?.transactionId == transaction_id`)
9- `reference` ( find all Order where `order.reference === reference` )

10- `is_have_package` ( find all Order where `order.packages > 0` )
11- `with_coupon` ( find all Order where `order?.appliedCoupons > 0` )
12- `with_discound` (find all Order where `order?.total_discount > 0 && order?.total_discount)

13- `program_discounted` (find all Order where `order?.program_price_discounted > 0 && order?.program_price_discounted)

also i want to implement search logic

14-  `user_search`  param, string should search over `order.userId?.first_name` and ``order.userId?.last_name`` and `order.userId?.mobile`

14-  `program_search`  param, string should search over `order.classProgramId?.coach?.first_name` and `order.classProgramId?.coach?.last_name`` and `order.classProgramId?.coach?.mobile`