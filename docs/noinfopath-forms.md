# noinfopath.forms
@version 0.1.3

Combines the functionality of validation from bootstrap and angular.


## noForm : Directive

> NOTE: This directive requires a parent element that is decorated with an `ng-form` directive.

### Attributes

|Name|Description|
|----|-----------|
|no-form|When `Undefined` configuration comes from the other attribute added to the element. When a string is provided, it is the configuration key for accessing the form's configuration from the noConfig service.|
|no-provider|The name of the NoInfoPath service that will provide the CRUD transport.|
|no-database|The location of the Tables or Collections that this form will read and write to.|
|no-datasource|The name of a table, view or collection contained in the database. The data source must expose a NoCRUD interface.|

##### Usage

 ```html

<div no-form no-provider="noIndexedDB" no-database="FCFNv2" no-datasoure="Cooperator">
	... other form elements ...
</div>

 ```
  OR

 ```html

 <div no-form="myform">
	... other form elements ...
</div>

 ```

### NoInfoPath Form Configuration

 When a NoInfoPath Form Configuration is used, it defines the semantics of
how data is read and written by the form. The following is an
example of how the configuration object is defined. Note that when
datasource is a `String` that it is the name of an entity on the
database.  When an obect it is instructions on how to proccess
multi-table relationships represented by the form.


##### Sample NoInfoPath Form Configuration

```json
{
	"myform": {
		"provider": "noWebSQL",
		"database": "FCFNv3",
		"datasource": {
			"create": [
				"Cooperators",
				"Addresses",
				"CooperatorAddresses":
				[
					"Cooperators",
					"Addresses"
				]

				],
			"read": "vwCooperator",
			"update": [
				"Cooperators",
				"Addresses"
				],
			"destroy": [
				"CooperatorAddresses",
				"Cooperators",
				"Addresses"
				]
			}
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

