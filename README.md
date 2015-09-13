# noinfopath.forms
@version 0.1.1

Combines the functionality of validation from bootstrap and angular.


 ## noForm : Directive

> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.

### Attributes

 |Name|Description|
 |----|-----------|
 |no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
 |no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
 |no-datasource|The location of the Tables or Collections that this form will read and write to.|
 |no-schema|The name of the NoInfoPath Form Schema that defines the semantics of how data is read and written by the form.|

##### Usage

 ```html

<div no-form no-provider="noIndexedDB" no-datasource="FCFNv2" no-schema="Cooperator">
	... other form elements ...
</div>

 ```
  OR

 ```html

 <div no-form="myform">
	... other form elements ...
</div>

 ```

##### Sample NoInfoPath Form Configuration

```json
{
	"myform": {
		"provider": "noIndexedDB",
		"datasource": "FCFNv2",
		"schema": "Cooperator"
	}
}
```

## noErrors

The noErrors directive provides the container for applying the
BootStrap validation CSS, in response to AngularJS validation
attributes. The directive works in conjunction with with the noSubmit
and noReset directive.

It also provides compatibliy with Kendo UI controls and no-file-upload
component.


## noSubmit

When user clicks submit, checks to make sure the data is appropriate and returns an error if not.

## noReset

When user clicks reset, form is reset to null state.

