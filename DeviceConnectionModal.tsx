import { topRight } from "@shopify/react-native-skia";
import React, { FC, useCallback } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  Modal,
  SafeAreaView,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  View,
} from "react-native";
import { Device } from "react-native-ble-plx";
import { Ionicons } from "@expo/vector-icons";   

type DeviceModalListItemProps = {
  item: ListRenderItemInfo<Device>;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

type DeviceModalProps = {
  devices: Device[];
  visible: boolean;
  connectToPeripheral: (device: Device) => void;
  closeModal: () => void;
};

const DeviceModalListItem: FC<DeviceModalListItemProps> = (props) => {
  const { item, connectToPeripheral, closeModal } = props;

  const connectAndCloseModal = useCallback(() => {
    connectToPeripheral(item.item);   
    closeModal();
  }, [closeModal, connectToPeripheral, item.item]);

  return (
    <TouchableOpacity onPress={connectAndCloseModal} style={modalStyle.ctaButton}>
      <Text style={modalStyle.ctaButtonText}>
        {item.item.name || "Unnamed Device"}
      </Text>
    </TouchableOpacity>
  );
};

const DeviceModal: FC<DeviceModalProps> = (props) => {
  const { devices, visible, connectToPeripheral, closeModal } = props;

  const renderDeviceModalListItem = useCallback(
    (item: ListRenderItemInfo<Device>) => {
      return (
        <DeviceModalListItem
          item={item}
          connectToPeripheral={connectToPeripheral} 
          closeModal={closeModal}
        />
      );
    },
    [closeModal, connectToPeripheral]
  );

  const HeaderTitle = () => {
    return (
      <Text style={modalStyle.modalTitleText}>
        {"Turn on"} Proximity Communicator and {"Tap on"} Scanned Device
      </Text>
    );
  };

  return (
    <Modal
      style={modalStyle.modalContainer}
      animationType="slide"
      transparent={false}
      visible={visible}
    >
      <SafeAreaView style={modalStyle.modalTitle}>

        {/* The new X button */}
        <TouchableOpacity style={modalStyle.closeButton} onPress={closeModal}>
          <Ionicons name="close" size={36} color="black" />
        </TouchableOpacity>

        <Image
          source={require('./Images/logo.jpg')}
          style={modalStyle.logoImage}
        />

        <FlatList
          ListHeaderComponent={HeaderTitle}
          contentContainerStyle={modalStyle.modalFlatlistContiner}
          data={devices.filter(d => d && d.id)}
          renderItem={renderDeviceModalListItem}
        />
      </SafeAreaView>
    </Modal>
  );
};

const modalStyle = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#2277ee",
  },

  modalFlatlistContiner: {
    flex: 1,
    justifyContent: "center",
    alignContent: "center",
    marginHorizontal: 100,
    marginVertical: 100,
    marginBottom: 250,
    backgroundColor: "white",
  },

  logoImage: {
    width: "28%",
    height: "6%",
    marginTop: "2%",
  },

  modalCellOutline: {
    borderWidth: 1,
    borderColor: "black",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
  },

  modalTitle: {
    flex: 1,
    backgroundColor: "white",
  },

  modalTitleText: {
    fontSize: 30,
    fontWeight: "bold",
    marginHorizontal: 5,
    marginBottom: 30,
    textAlign: "center",
  },

  // X Button styling
  closeButton: {
    position: "absolute",
    right: 15,
    top: 10,
    zIndex: 100,
    padding: 6,
  },

  ctaButton: {
    backgroundColor: "#2277ee",
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    marginHorizontal: 25,
    marginBottom: 5,
    borderRadius: 10,
  },

  ctaButtonText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "black",
  },
});

export default DeviceModal;
