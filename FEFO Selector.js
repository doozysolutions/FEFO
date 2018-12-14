/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/log', 'N/record', 'N/search', 'N/http', 'N/runtime'],
    function(serverWidget, log, record, search, http, runtime) {
        function onRequest(context) {
            if (context.request.method === 'GET') {
            	var woLocation = context.request.parameters.custparam_location;
                var woRecordId = context.request.parameters.custparam_recordid;
                var scriptObj = runtime.getCurrentScript();
                var roundingFactor = scriptObj.getParameter({name: 'custscript_ce_rounding_factor'});
                var form = serverWidget.createForm({
                    title: 'FEFO Selector',
                    hideNavBar: false
                });
                form.clientScriptModulePath = './FEFO Selector Client.js';
                form.addFieldGroup({
                	id: 'custpage_workorderinfo',
                	label: 'Work Order Information'
                });
                var woRecordFld = form.addField({
                    id: 'worecord',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Work Order',
                    source: '-30',
                    container: 'custpage_workorderinfo'
                });
				woRecordFld.updateDisplayType({
                	displayType: serverWidget.FieldDisplayType.INLINE
                });
                woRecordFld.setHelpText({
                	help: "The FEFO selection will be performed on this work order."
                });
                var woLocationFld = form.addField({
                    id: 'wolocation',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Location',
                    source: '-103',
                    container: 'custpage_workorderinfo'
                });
                woLocationFld.updateDisplayType({
                	displayType: serverWidget.FieldDisplayType.INLINE
                });
                woLocationFld.setHelpText({
                	help: "The lots selected will come from the location\
                    in the header of the transaction."
                });
                form.addSubmitButton({
                    label: 'Select'
                });
                var lotItemObj = { lotItemId: [], lotItemName: [], lotItemLineId: [], lotItemQty: [], lotItemInvDet: [] };
                var lotConsumptionArr = [];
                var woRecord = record.load({
                    type: record.Type.WORK_ORDER,
                    id: woRecordId,
                    isDynamic: true
                });
                var woItemLineCount = woRecord.getLineCount({
                    sublistId: 'item'
                });
                for (var i = 0; i < woItemLineCount; i++) {
                    var sublistName = 'custpage_sl';
                    var itemId = woRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    var itemFieldsCheck = checkLotItem(itemId);
                    if (itemFieldsCheck.islotitem) {
                        // log.debug({
                        //     title: 'WO Line #',
                        //     details: i
                        // });
                        var itemName = woRecord.getSublistText({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        var subtabName = woRecord.getSublistText({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });
                        if (subtabName.indexOf(':') >= 0) {
                            subtabName = subtabName.substring(subtabName.indexOf(':') + 2, subtabName.indexOf(':') + subtabName.length);
                        }
                        var itemLineId = woRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'line',
                            line: i
                        });
                        var itemQty = woRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                        subtabName += ' (' + itemQty + ')';
                        var lineSelect = woRecord.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        var itemInvDet = woRecord.hasCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: i
                        });
                        var itemInvDetId = woRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: i
                        });
                        sublistName += itemLineId;
                        var lotSelectSublist = form.addSublist({
                            id: sublistName,
                            type: serverWidget.SublistType.INLINEEDITOR,
                            label: subtabName
                        });
                        var sublistNameFld = lotSelectSublist.addField({
                            id: 'custpage_sublistname',
                            label: 'Sublist Name',
                            type: serverWidget.FieldType.TEXT
                        });
                        sublistNameFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        var itemFld = lotSelectSublist.addField({
                            id: 'custpage_item',
                            label: 'Item',
                            type: serverWidget.FieldType.SELECT,
                            source: '-10'
                        });
                        itemFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        var lotFld = lotSelectSublist.addField({
                            id: 'custpage_lot',
                            label: 'Lot Number',
                            type: serverWidget.FieldType.TEXT
                        });
                        lotFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        var lotIdFld = lotSelectSublist.addField({
                            id: 'custpage_lotid',
                            label: 'Lot Id',
                            type: serverWidget.FieldType.INTEGER
                        });
                        lotIdFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        var expFld = lotSelectSublist.addField({
                            id: 'custpage_expdate',
                            label: 'Expiration Date',
                            type: serverWidget.FieldType.DATE
                        });
                        expFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        var onHandQtyFld = lotSelectSublist.addField({
                            id: 'custpage_onhand',
                            label: 'On Hand',
                            type: serverWidget.FieldType.FLOAT
                        });
                        onHandQtyFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        var availQtyFld = lotSelectSublist.addField({
                            id: 'custpage_available',
                            label: 'Available',
                            type: serverWidget.FieldType.FLOAT
                        });
                        availQtyFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        var isOnHandQtyFld = lotSelectSublist.addField({
                            id: 'custpage_isonhand',
                            label: 'Is On Hand',
                            type: serverWidget.FieldType.CHECKBOX
                        });
                        isOnHandQtyFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.DISABLED
                        });
                        var qtyFld = lotSelectSublist.addField({
                            id: 'custpage_quantity',
                            label: 'Quantity',
                            type: serverWidget.FieldType.FLOAT
                        });
                        qtyFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.NORMAL
                        });
                        var qtyRemainFld = lotSelectSublist.addField({
                            id: 'custpage_quantityremaining',
                            label: 'Line Quantity Remaining',
                            type: serverWidget.FieldType.FLOAT
                        });
                        qtyRemainFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN
                        });
                        var selectFld = lotSelectSublist.addField({
                            id: 'custpage_select',
                            label: 'Select',
                            type: serverWidget.FieldType.CHECKBOX
                        });
                        selectFld.updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.NORMAL
                        });
                        var availLotNumbers = searchLotNumbers(itemId, woLocation);
                        var lineTotal = itemQty; var remainLineQty = itemQty; var lineSetQty = 0; var selectLine = 'T';
                        if (availLotNumbers.length > 0) {
                            for (var a = 0; a < availLotNumbers.length; a++) {
                                var lotNumberText = availLotNumbers[a].getValue({
                                    name: 'inventorynumber'
                                });
                                var lotNumberId = availLotNumbers[a].getValue({
                                    name: 'internalid'
                                });
                                var lotNumberExp = availLotNumbers[a].getValue({
                                    name: 'expirationdate'
                                });
                                var lotNumberOnHand = availLotNumbers[a].getValue({
                                    name: 'quantityonhand'
                                });
                                var lotNumberAvailable = availLotNumbers[a].getValue({
                                    name: 'formulanumeric'
                                });
                                var lotNumberIsOnHand = availLotNumbers[a].getValue({
                                    name: 'isonhand'
                                });
                                if (lotNumberIsOnHand) { lotNumberIsOnHand = 'T'; }
                                log.debug({
                                    title: 'Before Calc',
                                    details: 'Line Set Qty: ' + lineSetQty + ' Remain Line Set Qty: ' + remainLineQty + ' Lot Number Avail: ' + lotNumberAvailable
                                });
                                var lotConsumptionObjIndex = findLotConsumptionObjIndex(lotConsumptionArr, 'lotid', lotNumberId);
                                if (lotConsumptionObjIndex < 0) {
                                    log.audit({
                                        title: 'lotConsumptionObjIndex < 0',
                                        details: lotNumberId + ' | ' + lotNumberAvailable
                                    });
                                    lineSetQty = calcLineSetQty(remainLineQty, lotNumberAvailable);
                                } else {
                                    log.audit({
                                        title: 'lotConsumptionObjIndex | ' + lotConsumptionObjIndex,
                                        details: lotNumberId + ' | ' + lotConsumptionArr[lotConsumptionObjIndex].lotnumberavailable
                                    });
                                    lineSetQty = calcLineSetQty(remainLineQty, lotConsumptionArr[lotConsumptionObjIndex].lotnumberavailable);
                                }
                                log.debug({
                                    title: 'After Calc',
                                    details: 'Line Set Qty: ' + lineSetQty + ' Remain Line Set Qty: ' + remainLineQty + ' Lot Number Avail: ' + lotNumberAvailable
                                });
                                lineSetQty = parseFloat(lineSetQty);
                                log.debug({
                                    title: 'Line #: Line Total | Remaining Line Quantity | Line Set Quantity',
                                    details: a + ' | ' + lineTotal + ' | ' + remainLineQty + ' | ' + lineSetQty
                                });
                                lineSetQty = lineSetQty.toFixed(roundingFactor);
                                if (parseFloat(lineSetQty) > parseFloat(lotNumberAvailable)) { 
                                    log.debug({
                                         title: 'lineSetQty - lotNumberAvailable',
                                         details: lineSetQty + '>' + lotNumberAvailable
                                    });
                                    // Line Deprecated (2/20/2018 - JB)
                                    // lineSetQty = lineSetQty - .01; lineSetQty = lineSetQty.toFixed(roundingFactor);
                                    lineSetQty = parseFloat(lineSetQty);
                                    lineSetQty = lineSetQty.toFixed(roundingFactor);
                                }
                                remainLineQty = parseFloat(remainLineQty) - parseFloat(lineSetQty);
                                remainLineQty = parseFloat(remainLineQty);
                                if (remainLineQty > 0) { remainLineQty = remainLineQty.toFixed(roundingFactor); }
                                log.debug({
                                    title: 'After Parse Float',
                                    details: 'Line Set Qty: ' + lineSetQty + ' Remain Line Set Qty: ' + remainLineQty + ' Lot Number Avail: ' + lotNumberAvailable
                                });
                                if (remainLineQty < 0) { lineSetQty = 0; selectLine = 'F'; }
                                if (lineSetQty <= 0) { lineSetQty = 0; selectLine = 'F'; }
                                var newLotConsumptionObj = {lotid: lotNumberId, lotnumberavailable: parseFloat(lotNumberAvailable) - parseFloat(lineSetQty)};
                                var lotConsumptionObjIndex = findLotConsumptionObjIndex(lotConsumptionArr, 'lotid', lotNumberId);
                                if (lotConsumptionObjIndex < 0) {
                                    lotConsumptionArr.push(newLotConsumptionObj);
                                    log.audit({
                                        title: 'lotConsumptionArr Before Splice',
                                        details: JSON.stringify(lotConsumptionArr)
                                    });
                                } else {
                                    var lotConsumptionObj = {
                                        lotid: lotNumberId,
                                        lotnumberavailable: parseFloat(lotConsumptionArr[lotConsumptionObjIndex].lotnumberavailable) - parseFloat(lineSetQty)
                                    }
                                    log.audit({
                                        title: 'lotConsumptionObj',
                                        details: JSON.stringify(lotConsumptionObj)
                                    });
                                    lotConsumptionArr.splice(lotConsumptionObjIndex, 1, lotConsumptionObj);
                                    log.audit({
                                        title: 'lotConsumptionArr After Splice',
                                        details: JSON.stringify(lotConsumptionArr)
                                    });
                                }
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_sublistname',
                                    line: a,
                                    value: sublistName
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_item',
                                    line: a,
                                    value: itemId
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_lot',
                                    line: a,
                                    value: lotNumberText
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_lotid',
                                    line: a,
                                    value: lotNumberId
                                });
                                if (lotNumberExp) { 
                                    lotSelectSublist.setSublistValue({
                                        id: 'custpage_expdate',
                                        line: a,
                                        value: lotNumberExp
                                    });
                                }
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_onhand',
                                    line: a,
                                    value: lotNumberOnHand
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_available',
                                    line: a,
                                    value: lotNumberAvailable
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_isonhand',
                                    line: a,
                                    value: lotNumberIsOnHand
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_quantity',
                                    line: a,
                                    value: lineSetQty
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_quantityremaining',
                                    line: a,
                                    value: remainLineQty
                                });
                                lotSelectSublist.setSublistValue({
                                    id: 'custpage_select',
                                    line: a,
                                    value: selectLine
                                });
                                selectLine = 'T';
                            }
                        }
                    }
                }
                // log.debug({
                //     title: 'Item Object',
                //     details: lotItemObj
                // });
                woRecord.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
                form.updateDefaultValues({wolocation: woLocation, worecord: woRecordId});
                context.response.writePage(form);
            } else {
                var woRecord = context.request.parameters.worecord;
                var woLocation = context.request.parameters.wolocation;
                var workOrder = record.load({
                    type: record.Type.WORK_ORDER,
                    id: woRecord,
                    isDynamic: true
                });
                var woItemLineCount = workOrder.getLineCount({
                    sublistId: 'item'
                });
                // log.debug({
                //     title: 'woItemLineCount',
                //     details: woItemLineCount
                // });
                for (var i = 0; i < woItemLineCount; i++) {
                    // log.debug({
                    //     title: 'Line #',
                    //     details: i
                    // });
                    workOrder.selectLine({
                        sublistId: 'item',
                        line: i
                    });
                    var invDetLine = workOrder.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'inventorydetailavail'
                    });
                    // log.debug({
                    //     title: 'Inventory Detail Available',
                    //     details: invDetLine
                    // });
                    if (invDetLine == 'T') {
                        var itemLineId = workOrder.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'line'
                        });
                        var sublistName = 'custpage_sl' + itemLineId;
                        var lotItemLineCount = context.request.getLineCount({
                            group: sublistName
                        });
                        var lotItemSublistName = context.request.getSublistValue({
                            group: sublistName,
                            name: 'custpage_sublistname',
                            line: 0
                        });
                        var hasInvDet = workOrder.hasCurrentSublistSubrecord({
                            sublistId: 'item',
                            fieldId: 'inventorydetail',
                            line: i
                        });
                        // log.debug({
                        //     title: 'Has Inventory Detail',
                        //     details: hasInvDet
                        // });
                        // log.debug({
                        //     title: 'Sublist Name = Lot Item Sublist Name',
                        //     details: sublistName + ' = ' + lotItemSublistName
                        // });
                        if (sublistName == lotItemSublistName) {
                            if (hasInvDet) {
                                // Remove Inventory Detail Sublist Subrecords
                                // log.debug({
                                //     title: 'Remove Subrecord',
                                //     details: ''
                                // });
                            } else {
                                var selectLine = 'F';
                                for (var a = 0; a < lotItemLineCount; a++) {
                                    var selectLot = context.request.getSublistValue({
                                        group: sublistName,
                                        name: 'custpage_select',
                                        line: a
                                    });
                                    if (selectLot == 'T') {
                                        selectLine == 'T';
                                        var lotNum = context.request.getSublistValue({
                                            group: sublistName,
                                            name: 'custpage_lotid',
                                            line: a
                                        });
                                        var lotSetQty = context.request.getSublistValue({
                                            group: sublistName,
                                            name: 'custpage_quantity',
                                            line: a
                                        });
                                        var invDetRec = workOrder.getCurrentSublistSubrecord({
                                            sublistId: 'item',
                                            fieldId: 'inventorydetail'

                                        });
                                        invDetRec.selectNewLine({
                                            sublistId: 'inventoryassignment'
                                        });
                                        invDetRec.setCurrentSublistValue({
                                            sublistId: 'inventoryassignment',
                                            fieldId: 'issueinventorynumber',
                                            value : lotNum
                                        });
                                        invDetRec.setCurrentSublistValue({
                                            sublistId: 'inventoryassignment',
                                            fieldId: 'quantity',
                                            value : lotSetQty
                                        });
                                        invDetRec.commitLine({
                                            sublistId: 'inventoryassignment'
                                        });
                                    }
                                }
                            }
                        }
                        workOrder.commitLine({
                            sublistId: 'item'
                        });
                    }
                }
                workOrder.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: false
                });
	           	context.response.write('<script>window.close();</script>');
            }
        }
        return {
            onRequest: onRequest
        };
    	function searchLotNumbers(itemId, woLocation) {
            // log.debug({
            //     title: 'Parameters',
            //     details: 'itemId: ' + itemId + ' | ' + 'woLocation: ' + woLocation
            // });
    		var lotNumbersSearch = search.create({
    			type: search.Type.INVENTORY_NUMBER,
    			columns: [{
    				name: 'internalid',    				
    			}, {
    				name: 'item'
    			}, {
                    name: 'inventorynumber'
                }, {
                    name: 'expirationdate',
                    sort: search.Sort.ASC
                }, {
                    name: 'quantityonhand'
                }, {
                    name: 'quantityavailable'
                }, {
                    name: 'formulanumeric',
                    formula: 'TRUNC({quantityavailable}, 2)'
                }, {
                    name: 'isonhand'
                }],
    			filters: [{
                    name: 'internalidnumber',
                    join: 'item',
                    operator: 'equalto',
                    values: itemId
                }, {
    				name: 'quantityonhand',
    				operator: 'greaterthan',
    				values: 0
    			}, {
                    name: 'quantityavailable',
                    operator: 'greaterthan',
                    values: 0
                }, {
                    name: 'location',
                    operator: 'anyof',
                    values: woLocation
                }, {
                    name: 'isonhand',
                    operator: 'is',
                    values: 'T'
                }]

    		});
    		var searchResult = lotNumbersSearch.run().getRange({
    			start: 0,
    			end: 100
    		});
    		return searchResult;
    	}
        function checkLotItem(itemId) {
            var lotItemCheck = search.lookupFields({
                type: 'item',
                id: itemId,
                columns: ['islotitem']
            });
            return lotItemCheck;
        }
        function calcLineSetQty(remainLineQty, availQty) {
            // log.debug({
            //     title: 'Parameters',
            //     details: 'remainLineQty: ' + remainLineQty + ' | ' + 'availQty: ' + availQty
            // });
            if (remainLineQty < availQty) {
                return remainLineQty;
            } else if (remainLineQty > availQty && availQty != 0) {
                return availQty;
            } else if (remainLineQty == availQty) {
                return availQty;
            } else {
                return 0;
            }
        }
        function searchInvDet(woRecord, internalid) {
            // log.debug({
            //     title: 'Parameters',
            //     details: 'woRecord: ' + woRecord + ' | ' + 'internalid: ' + internalid
            // });
            var invDetSearch = search.create({
                type: search.Type.TRANSACTION,
                columns: [{
                    name: 'internalid',
                    join: 'inventoryDetail'                
                }, {
                    name: 'inventorynumber',
                    join: 'inventoryDetail'
                }, {
                    name: 'quantity',
                    join: 'inventoryDetail'
                }],
                filters: [{
                    name: 'internalidnumber',
                    operator: 'equalto',
                    values: woRecord
                }, {
                    name: 'internalid',
                    join: 'inventorydetail',
                    operator: 'anyof',
                    values: internalid
                }]

            });
            var searchResult = invDetSearch.run().getRange({
                start: 0,
                end: 100
            });
            return searchResult;
        }
        function searchInvNum(itemId, woLocation) {
            // log.debug({
            //     title: 'Parameters',
            //     details: 'lotId: ' + itemId + ' | ' + 'woLocation: ' + woLocation
            // });
            var invNumSearch = search.create({
                type: search.Type.INVENTORY_NUMBER,
                columns: [{
                    name: 'internalid',              
                }, {
                    name: 'inventorynumber',
                }, {
                    name: 'expirationdate',
                    sort: search.Sort.ASC
                }, {
                    name: 'quantityonhand',
                }, {
                    name: 'quantityavailable',
                }, {
                    name: 'isonhand',
                }, {
                    name: 'item',
                }],
                filters: [{
                    name: 'internalidnumber',
                    join: 'item',
                    operator: 'equalto',
                    values: itemId
                }, {
                    name: 'quantityonhand',
                    operator: 'greaterthan',
                    values: 0
                }, {
                    name: 'location',
                    operator: 'anyof',
                    values: woLocation
                }]

            });
            var searchResult = invNumSearch.run().getRange({
                start: 0,
                end: 100
            });
            return searchResult;
        }
        function searchSetInvDet(woRecord, itemInvDetId, invNumId) {
            // log.debug({
            //     title: 'Parameters',
            //     details: 'woRecord: ' + woRecord + ' | ' + 'itemInvdetId: ' + itemInvDetId + 'invNumId: ' + ' | ' + invNumId
            // });
            var invSetDetSearch = search.create({
                type: search.Type.TRANSACTION,
                columns: [{
                    name: 'internalid',
                    join: 'inventoryDetail'                
                }, {
                    name: 'inventorynumber',
                    join: 'inventoryDetail'
                }, {
                    name: 'quantity',
                    join: 'inventoryDetail'
                }],
                filters: [{
                    name: 'internalidnumber',
                    operator: 'equalto',
                    values: woRecord
                }, {
                    name: 'internalid',
                    join: 'inventorydetail',
                    operator: 'anyof',
                    values: itemInvDetId
                }, {
                    name: 'inventorynumber',
                    join: 'inventorydetail',
                    operator: 'anyof',
                    values: invNumId
                }]

            });
            var searchResult = invSetDetSearch.run().getRange({
                start: 0,
                end: 100
            });
            return searchResult;
        }
        function findLotConsumptionObjIndex(array, attr, value) {
          for (var i = 0; i < array.length; i += 1) {
            if(array[i][attr] === value) {
              return i;
            }
          }
          return -1;
        }
    });