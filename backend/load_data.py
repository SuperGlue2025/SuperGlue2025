# backend/data_reader.py
import pandas as pd
import os


class DataLoader:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir

    def read_compounds(self):
        """read compounds from csv file"""
        try:
            df = pd.read_csv(os.path.join(self.data_dir, 'example_cmpds.csv'))

            # convert to dict
            compounds = df.to_dict('records')
            return compounds
        except Exception as e:
            raise Exception(f"Error reading compounds: {str(e)}")

    def read_compound_by_id(self, compound_id):
        """read compound by id from csv file"""
        try:
            df = pd.read_csv(os.path.join(self.data_dir, 'example_cmpds.csv'))
            compound = df[df['cmpd_id'] == compound_id].to_dict('records')
            return compound[0] if compound else None
        except Exception as e:
            raise Exception(f"Error reading compound {compound_id}: {str(e)}")