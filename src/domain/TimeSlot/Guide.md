# Time Slot API Guide

### Create time slot by admin

```
POST   api/v1/time-slot

```

> Admin will be select all time-slot by choosing them from calender and then we will send a request for store all of them in DB

```js

// Request Body
[
  {
    date,
    startTime,
    endTime
  }
]

```
