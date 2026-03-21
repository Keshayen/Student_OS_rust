use loro::{LoroDoc, LoroValue, LoroMap, LoroText, VersionVector, ExportMode, ToJson};
use std::fs;
use std::path::PathBuf;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use super::models::Identifiable;

#[derive(Serialize, Deserialize)]
struct DeviceConfig {
    peer_id: u64,
}

pub struct LoroManager {
    pub doc: LoroDoc,
    storage_path: PathBuf,
}

impl LoroManager {
    pub fn new(storage_path: PathBuf) -> Result<Self> {
        let config_path = storage_path.with_file_name("device_config.json");
        let peer_id = if config_path.exists() {
            let content = fs::read_to_string(&config_path)?;
            let config: DeviceConfig = serde_json::from_str(&content)
                .map_err(|e| anyhow!("Failed to parse device config: {:?}", e))?;
            config.peer_id
        } else {
            let doc = LoroDoc::new();
            let id = doc.peer_id();
            let config = DeviceConfig { peer_id: id };
            fs::write(&config_path, serde_json::to_string(&config)?)?;
            id
        };

        let doc = LoroDoc::new();
        doc.set_record_timestamp(true);
        doc.set_peer_id(peer_id)
            .map_err(|e| anyhow!("Loro set peer id error: {:?}", e))?;

        if storage_path.exists() {
            let bytes = fs::read(&storage_path)?;
            if !bytes.is_empty() {
                doc.import_batch(&[bytes])
                    .map_err(|e| anyhow!("Loro import error: {:?}", e))?;
            }
        }
        Ok(Self { doc, storage_path })
    }


    pub fn save(&self) -> Result<()> {
        let bytes = self.doc
            .export(ExportMode::Snapshot)
            .map_err(|e| anyhow!("Loro export error: {:?}", e))?;
        fs::write(&self.storage_path, bytes)?;
        Ok(())
    }

    pub fn get_collection_map(&self, name: &str) -> Result<LoroMap> {
        let collection = self.doc.get_map(name);
        Ok(collection)
    }

    pub fn get_records<T>(&self, collection_name: &str) -> Result<Vec<T>>
    where
        T: for<'de> serde::Deserialize<'de>,
    {
        let collection = self.get_collection_map(collection_name)?;
        let mut records = Vec::new();
        // Use get_deep_value to expand all nested containers into JSON-compatible maps/strings
        if let LoroValue::Map(map) = collection.get_deep_value() {
            for (_, val) in map.iter() {
                let json_val: Value = val.to_json_value();
                let record: T = serde_json::from_value(json_val)?;
                records.push(record);
            }
        }
        Ok(records)
    }


    pub fn upsert_record_no_save<T>(&self, collection_name: &str, record: &T) -> Result<()>
    where
        T: serde::Serialize + Identifiable,
    {
        let json_val = serde_json::to_value(record)?;
        self.upsert_value_no_save(collection_name, json_val)
    }

    pub fn upsert_value_no_save(&self, collection_name: &str, mut json_val: serde_json::Value) -> Result<()> {
        let collection = self.get_collection_map(collection_name)?;
        let id = json_val.get("id")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow!("ID missing from value record"))?
            .to_string();
        
        if let serde_json::Value::Object(ref mut map) = json_val {
            let now = chrono::Utc::now().to_rfc3339();
            map.insert("updatedAt".to_string(), serde_json::Value::String(now));
        }
        
        let record_map = collection
            .get_or_create_container(&id, LoroMap::default())
            .map_err(|e| anyhow!("Loro error creating record map for {}: {:?}", id, e))?;
            
        if let serde_json::Value::Object(map) = json_val {
            for (key, val) in map {
                if (key == "content" || key == "notes") && val.is_string() {
                    let s = val.as_str().unwrap_or("");
                    let text_container = record_map.get_or_create_container(&key, LoroText::default())
                        .map_err(|e| anyhow!("Loro error creating text container for {}.{}: {:?}", id, key, e))?;
                    
                    if text_container.to_string() != s {
                        text_container.update(s, loro::UpdateOptions::default())
                            .map_err(|e| anyhow!("Loro text update error on {}.{}: {:?}", id, key, e))?;
                    }
                } else {
                    record_map.insert(&key, val)
                        .map_err(|e| anyhow!("Loro error inserting value into {}.{}: {:?}", id, key, e))?;
                }
            }
        }
        Ok(())
    }

    pub fn upsert_record<T>(&self, collection_name: &str, record: &T) -> Result<()>
    where
        T: serde::Serialize + Identifiable,
    {
        self.upsert_record_no_save(collection_name, record)?;
        self.save()?;
        Ok(())
    }


    pub fn delete_record(&self, collection_name: &str, id: &str) -> Result<()> {
        let collection = self.get_collection_map(collection_name)?;
        collection
            .delete(id)
            .map_err(|e| anyhow!("Loro delete error: {:?}", e))?;
        self.save()?;
        Ok(())
    }

    pub fn export_updates(&self, vv: &VersionVector) -> Result<Vec<u8>> {
        let bytes = self.doc
            .export(ExportMode::Updates {
                from: std::borrow::Cow::Borrowed(vv),
            })
            .map_err(|e| anyhow!("Loro export error: {:?}", e))?;
        Ok(bytes)
    }

    pub fn import_updates(&self, data: &[u8]) -> Result<()> {
        self.doc
            .import(data)
            .map_err(|e| anyhow!("Loro import error: {:?}", e))?;
        self.save()?;
        Ok(())
    }

    pub fn get_vv(&self) -> VersionVector {
        self.doc.oplog_vv()
    }

    pub fn peer_id(&self) -> String {
        self.doc.peer_id().to_string()
    }

    pub fn encode_vv(vv: &VersionVector) -> Vec<u8> {
        vv.encode()
    }

    pub fn decode_vv(bytes: &[u8]) -> Result<VersionVector> {
        VersionVector::decode(bytes).map_err(|e| anyhow!("Loro VV decode error: {:?}", e))
    }

    pub fn nuke(&mut self) -> Result<()> {
        let current_peer_id = self.doc.peer_id();
        let doc = LoroDoc::new();
        doc.set_peer_id(current_peer_id)
            .map_err(|e| anyhow!("Loro error: {:?}", e))?;
        doc.set_record_timestamp(true);
        self.doc = doc;
        let bytes = self.doc
            .export(ExportMode::Snapshot)
            .map_err(|e| anyhow!("Loro export error: {:?}", e))?;
        fs::write(&self.storage_path, bytes)?;
        Ok(())
    }

    pub fn dump_state(&self) -> String {
        format!("{:?}", self.doc.get_deep_value())
    }
}


