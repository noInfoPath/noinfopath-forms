
## noErrors

The noErrors directive provides the container for applying the
BootStrap validation CSS, in response to AngularJS validation
attributes. The directive works in conjunction with with the noSubmit
and noReset directive.

It also provides compatibliy with Kendo UI controls and no-file-upload
component.


## noSubmit

When user clicks submit, checks to make sure the data is appropriate and returns an error if not.

### Events

The noSubmit directive will broadcast events on the root scope to notify
the implementor that the data submitted is valid.

#### noSubmit::dataReady

Raise when the data submmited has passed all validations. Along with the
standard event object, the broadcast also sends a reference to the element
that has the noSubmit directive attached to it, the scope, and a timestamp.


## noReset

When user clicks reset, form is reset to null state.

