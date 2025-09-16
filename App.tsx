import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import MapView, { Marker, UrlTile, Callout, MapPressEvent } from "react-native-maps";

type Place = {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  description: string;
};

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState<any>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [placeDesc, setPlaceDesc] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  //  ดึงตำแหน่งปัจจุบัน
  const fetchLocation = async () => {
    setLoading(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied");
      setLoading(false);
      return;
    }

    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    setMapRegion({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setLoading(false);
  };

  // format เวลา
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      dateStyle: "full",
      timeStyle: "medium",
    });
  };

  // บันทึกหรือแก้ไขสถานที่
  const savePlace = () => {
    if (!placeName.trim() || !selectedCoords) {
      Alert.alert("กรุณากรอกชื่อสถานที่และเลือกตำแหน่ง");
      return;
    }

    if (editingPlace) {
      // แก้ไข
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === editingPlace.id
            ? { ...p, name: placeName, description: placeDesc }
            : p
        )
      );
      setEditingPlace(null);
    } else {
      //  เพิ่มใหม่
      const newPlace: Place = {
        id: Date.now().toString(),
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        name: placeName,
        description: placeDesc,
      };
      setPlaces([...places, newPlace]);
    }

    setPlaceName("");
    setPlaceDesc("");
    setSelectedCoords(null);
    setModalVisible(false);
    Alert.alert("บันทึกสำเร็จ!");
  };

  // ลบสถานที่
  const deletePlace = () => {
    if (!editingPlace) return;
    setPlaces((prev) => prev.filter((p) => p.id !== editingPlace.id));
    setEditingPlace(null);
    setPlaceName("");
    setPlaceDesc("");
    setSelectedCoords(null);
    setModalVisible(false);
    Alert.alert("ลบสำเร็จ!");
  };

  //  เมื่อกดบนแผนที่
  const handleMapPress = (event: MapPressEvent) => {
    if (event.nativeEvent.action === "marker-press") return; // ❌ กันไม่ให้ทับเวลาแตะหมุด

    setEditingPlace(null);
    setSelectedCoords(event.nativeEvent.coordinate);
    setPlaceName("");
    setPlaceDesc("");
    setModalVisible(true);
  };

  // เมื่อกดหมุด
  const handleMarkerPress = (place: Place) => {
    console.log("Pressed marker:", place);
    setEditingPlace(place);
    setPlaceName(place.name);
    setPlaceDesc(place.description);
    setSelectedCoords({ latitude: place.latitude, longitude: place.longitude });
    setModalVisible(true);
  };

  // กดรายการใน FlatList
  const goToPlace = (place: Place) => {
    setMapRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 My Location App</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : location ? (
        <>
          {/* ข้อมูลตำแหน่ง */}
          <View style={styles.card}>
            <Text style={styles.label}>เวลาที่แสดงตำแหน่ง:</Text>
            <Text style={styles.value}>{formatTime(location.timestamp)}</Text>
            <Text style={styles.label}>Latitude:</Text>
            <Text style={styles.value}>{location.coords.latitude}</Text>
            <Text style={styles.label}>Longitude:</Text>
            <Text style={styles.value}>{location.coords.longitude}</Text>
          </View>

          {/* ปุ่มตำแหน่งปัจจุบัน */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={fetchLocation}>
              <Text style={styles.buttonText}>📍 ตำแหน่งปัจจุบัน</Text>
            </TouchableOpacity>
          </View>

          {/* แผนที่ */}
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={(region) => setMapRegion(region)}
            onPress={handleMapPress}
          >
            <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} />

            {/* Marker ตำแหน่งตัวเอง */}
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="📍 You are here"
              pinColor="blue"
            />

            {/* Marker สถานที่ที่บันทึก */}
            {places.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                pinColor="red"
                onPress={() => handleMarkerPress(p)}
              >
                <Callout>
                  <View>
                    <Text>{p.name}</Text>
                    <Text>{p.description}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          {/* รายการสถานที่ */}
          <FlatList
            style={styles.list}
            data={places}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.listItem} onPress={() => goToPlace(item)}>
                <Text style={styles.listTitle}>{item.name}</Text>
                <Text style={styles.listDesc}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />

          {/* Modal เพิ่ม/แก้ไข */}
          <Modal visible={modalVisible} animationType="slide" transparent>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{editingPlace ? "แก้ไขสถานที่" : "บันทึกสถานที่"}</Text>

                {/* แสดงตำแหน่ง Latitude และ Longitude ที่กำลังจะบันทึก/แก้ไข */}
                {selectedCoords && (
                  <View style={styles.coordsDisplay}>
                    <Text style={styles.coordsText}>Latitude: {selectedCoords.latitude.toFixed(6)}</Text>
                    <Text style={styles.coordsText}>Longitude: {selectedCoords.longitude.toFixed(6)}</Text>
                  </View>
                )}

                <TextInput
                  style={styles.input}
                  placeholder="ชื่อสถานที่"
                  value={placeName}
                  onChangeText={setPlaceName}
                />
                <TextInput
                  style={[styles.input, { height: 80 }]}
                  placeholder="คำบรรยาย"
                  value={placeDesc}
                  onChangeText={setPlaceDesc}
                  multiline
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity style={styles.modalButton} onPress={savePlace}>
                    <Text style={styles.buttonText}>บันทึก</Text>
                  </TouchableOpacity>
                  {editingPlace && (
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: "red" }]}
                      onPress={deletePlace}
                    >
                      <Text style={styles.buttonText}>ลบ</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: "#aaa" }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <Text style={styles.error}>❌ Cannot fetch location</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 10
  },
  title: {
    marginTop: 50,
    fontSize: 22,
    fontWeight: "700",
    marginVertical: 10,
    color: "#333"
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    width: "95%",
    marginBottom: 10
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginTop: 6
  },
  value: {
    fontSize: 14,
    color: "#007AFF"
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    width: "95%"
  },
  button: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  },
  map: {
    flex: 1,
    width: "100%",
    borderRadius: 12,
    marginTop: 10
  },
  list: {
    width: "95%",
    maxHeight: 150,
    marginTop: 10
  },
  listItem: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5
  },
  listTitle: {
    fontWeight: "700",
    fontSize: 14
  },
  listDesc: {
    fontSize: 12,
    color: "#555"
  },
  error: {
    fontSize: 16,
    color: "red"
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },
  coordsDisplay: { // เพิ่ม style ใหม่
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  coordsText: { // เพิ่ม style ใหม่
    fontSize: 13,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    padding: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center"
  },
});