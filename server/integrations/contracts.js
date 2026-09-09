/** Configurable contracts for inbound CAD extraction and outbound ERP item/BOM sync. */
const IntegrationEvents = Object.freeze({ CAD_METADATA_IMPORT: 'cad.metadata.import', ERP_ITEM_SYNC: 'erp.item.sync', ERP_BOM_SYNC: 'erp.bom.sync' });

function validateAdapter(adapter) {
  if (!adapter || typeof adapter.name !== 'string' || typeof adapter.execute !== 'function') throw new TypeError('Adapter requires a name and execute(payload, context) function.');
  return adapter;
}
function cadMetadataContract(payload) {
  if (!payload?.documentId || !payload?.source || !payload?.fileVersionId) throw new TypeError('CAD import requires documentId, fileVersionId, and source.');
  return { documentId: payload.documentId, fileVersionId: payload.fileVersionId, source: payload.source, mapping: payload.mapping || {}, options: payload.options || {} };
}
function erpSyncContract(payload) {
  if (!payload?.erpSystem || !payload?.itemNumber || !['item', 'bom'].includes(payload.entityType)) throw new TypeError('ERP sync requires erpSystem, itemNumber, and entityType (item or bom).');
  return { erpSystem: payload.erpSystem, entityType: payload.entityType, itemNumber: payload.itemNumber, revision: payload.revision, payload: payload.payload || {}, idempotencyKey: payload.idempotencyKey };
}
module.exports = { IntegrationEvents, validateAdapter, cadMetadataContract, erpSyncContract };
