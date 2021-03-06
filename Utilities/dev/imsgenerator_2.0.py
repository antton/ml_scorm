# a simple tool to generate some formatted text based on file structure
import os
import sys
from os import walk
from os.path import isfile, join, abspath, dirname
from shutil import make_archive
import tkinter
from tkinter import filedialog
from tkinter import Entry, Label, Button, Grid


class Application:
    def __init__(self):
        self.unit_title = ""
        self.lesson_title = ""
        self.version = ""
        self.identifier = ""
        self.project_root = ""
        self.initialdir = "C:/"
        self.build_gui()
        self.root.mainloop()


    def set_project_root(self):
        self.project_path_entry.delete(0, "end")

        self.reset_gui()

        opts = {"parent": self.root,
                "title": "Select SCORM Project Root",
                "initialdir": self.initialdir}

        self.project_root = abspath(filedialog.askdirectory(**opts))
        self.project_path_entry.insert(0, self.project_root)

        self.initialdir = self.project_root

    def generate_manifest(self):
        unit_title = self.unit_title_entry.get()
        lesson_title = self.lesson_title_entry.get()
        version = self.version_entry.get()
        identifier = self.identifier_entry.get()
        file_path = os.path.join(self.project_root, "imsmanifest.xml")
        with open(file_path, "w", encoding="utf8") as new_file:
            generator = MosaicXmlGenerator(new_file)
            generator.make_intro(identifier, version, unit_title, lesson_title)
            generator.make_resources()
            self.manifest_button["bg"] = "#7cffac"
            self.manifest_button["text"] = "Manifest Generated!"
            self.manifest_button["fg"] = "black"
            os.startfile(self.project_root, "explore")

    def make_scorm_package(self):
        # create directory one level above project root called SCORM Packages for zip file
        output = join(dirname(self.project_root), 'SCORM Packages', self.zip_entry.get())
        make_archive(output, "zip", self.project_root)

        self.package_button["bg"] = "#7cffac"
        self.package_button["text"] = "SCORM Package Generated!"
        self.package_button["fg"] = "black"
        os.startfile(dirname(output), "explore")

    def resource_path(self, relative_path):
        """ Get absolute path to resource, works for dev and for PyInstaller """
        try:
            # PyInstaller creates a temp folder and stores path in _MEIPASS,
            # and places our data files in a folder relative to that temp
            # folder named as specified in the datas tuple in the spec file
            base_path = os.path.join(sys._MEIPASS, "data")
        except Exception:
            # sys._MEIPASS is not defined, so use the original path
            base_path = ""

        return os.path.join(base_path, relative_path)

    def root_changed_callback(self):
        if  self.project_root != abspath(self.project_path_entry.get()):
            self.project_root = abspath(self.project_path_entry.get())
            self.reset_gui()
        # Should probably do some actual validation here, but for now just always return True
        return True

    def build_gui(self):
        # looking at this now I'm not sure why everything is a variable on self?
        self.root = tkinter.Tk()
        self.root.iconbitmap(self.resource_path('.\\Watermelon16.ico'))
        self.root.wm_title("IMS Manifest Generator")
        self.root.minsize(300, 140)
        self.root.resizable(True, False)
        self.root.lift()

        Grid.columnconfigure(self.root, 0, weight=0, pad=10)
        Grid.columnconfigure(self.root, 1, weight=1, pad=10)
        Grid.rowconfigure(self.root, 0, pad=5)

        button_color = "#f0236b"
        text_box_color = "#7cffac"
        bg_color = "#f98294"

        self.root["bg"] = bg_color

        self.project_path_entry = Entry(self.root, background=text_box_color, validate="focusout", validatecommand=self.root_changed_callback)
        self.unit_title_entry = Entry(self.root, background=text_box_color)
        self.lesson_title_entry = Entry(self.root, background=text_box_color)
        self.version_entry = Entry(self.root, background=text_box_color)
        self.identifier_entry = Entry(self.root, background=text_box_color)
        self.zip_entry = Entry(self.root, background=text_box_color)

        self.unit_title_entry.insert(0, "Unit 1")
        self.lesson_title_entry.insert(0, "Lesson 1")
        self.version_entry.insert(0, 1)
        self.identifier_entry.insert(0, "com.mosaiclearning.client.project")

        self.project_root_button = Button(self.root, text="Select Project Root", command=self.set_project_root,
                                          background=button_color, foreground="white")
        self.manifest_button = Button(self.root, text="Generate Manifest", command=self.generate_manifest, background=button_color,
                                      foreground="white")
        self.package_button = Button(self.root, text="Make SCORM Package", command=self.make_scorm_package,
                                          background=button_color, foreground="white")

        self.unit_label = Label(self.root, text="Unit Title:", background=bg_color)
        self.lesson_label = Label(self.root, text="Lesson Title:", background=bg_color)
        self.version_label = Label(self.root, text="Version:", background=bg_color)
        self.identifier_label = Label(self.root, text="Identifier:", background=bg_color)
        self.zip_label = Label(self.root, text="Zip File Name:", background=bg_color)

        xpad = 5
        ypad = 3

        self.project_root_button.grid(row=0, column=0, columnspan=2, sticky="ew", padx=xpad, pady=0)
        self.project_path_entry.grid(row=1, column=0, columnspan=2, sticky="ew", padx=xpad, pady=1)
        self.unit_title_entry.grid(row=2, column=1, sticky="ew", padx=xpad, pady=ypad)
        self.unit_label.grid(row=2, column=0, sticky="e", padx=xpad, pady=ypad)
        self.lesson_title_entry.grid(row=3, column=1, sticky="ew", padx=xpad, pady=ypad)
        self.lesson_label.grid(row=3, column=0, sticky="e", padx=xpad, pady=ypad)
        self.version_entry.grid(row=4, column=1, sticky="ew", padx=xpad, pady=ypad)
        self.version_label.grid(row=4, column=0, sticky="e", padx=xpad, pady=ypad)
        self.identifier_entry.grid(row=5, column=1, sticky="ew", padx=xpad, pady=ypad)
        self.identifier_label.grid(row=5, column=0, sticky="e", padx=xpad, pady=ypad)
        self.manifest_button.grid(row=6, columnspan=2, sticky="ew", padx=xpad, pady=ypad)
        self.zip_label.grid(row=7, column=0, sticky="e", padx=xpad, pady=ypad)
        self.zip_entry.grid(row=7, column=1, sticky="ew", padx=xpad, pady=ypad)
        self.package_button.grid(row=8, columnspan=2, sticky="ew", padx=xpad, pady=ypad)

    def reset_gui(self):
        # reset manifest_button to default state
        self.manifest_button["bg"] = "#f0236b"
        self.manifest_button["text"] = "Generate Manifest"
        self.manifest_button["fg"] = "white"

        # reset package_button to default state
        self.package_button["bg"] = "#f0236b"
        self.package_button["text"] = "Make SCORM Package"
        self.package_button["fg"] = "white"



class MosaicXmlGenerator(object):
    def __init__(self, openfile):
        self.filetext = ''
        self.root_directory = os.path.split(openfile.name)[0]
        self.file = openfile

    def make_intro(self, identifier, version, unit, lesson):
        self.file.write('''<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<manifest identifier="''' + identifier + '''" version="''' + version + '''"
         xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
         xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                             http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                             http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">

  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>

  <organizations default="default_org">
    <organization identifier="default_org">
        <title>''' + unit + '''</title>
        <item identifier="item_1" identifierref="resource_1">
            <title>''' + lesson + '''</title>
        </item>
    </organization>
  </organizations>

  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">''')
        self.file.write('\n')

    def make_resources(self):
        for (dirpath, dirnames, filenames) in walk(self.root_directory):
            # Got at least one file in this directory
            if len(filenames):
                for filename in filenames:
                    if not isfile(dirpath + '/' + filename):
                        continue
                    if filename == 'imsgenerator.py':  # exclude this script itself #this is outdated now...
                        continue
                    self.file.write(self.make_file_row(dirpath, filename))
                    self.file.write('\n')

        self.file.write('''    </resource>
  </resources>
</manifest>
''')

    def make_file_row(self, dirpath, filename):
        return '      <file href="' + self.trim_file_path(join(dirpath, filename) + '" />')

    def trim_file_path(self, dirpath):
        return dirpath[len(self.root_directory) + 1:].replace('\\', '/')


if __name__ == '__main__':
    app = Application()
